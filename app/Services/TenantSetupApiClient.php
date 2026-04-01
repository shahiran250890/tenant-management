<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TenantSetupApiClient
{
    /**
     * Call internal setup API to create tenant database.
     */
    public function createDatabase(Tenant $tenant): void
    {
        $this->callStageEndpoint($tenant, 'database');
    }

    /**
     * Call internal setup API to run tenant migrations.
     */
    public function runMigrations(Tenant $tenant): void
    {
        $this->callStageEndpoint($tenant, 'migrations');
    }

    /**
     * Call internal setup API to run tenant seeders.
     */
    public function runSeeders(Tenant $tenant): void
    {
        $this->callStageEndpoint($tenant, 'seeders');
    }

    /**
     * Ensure bootstrap tenant user exists in target application.
     */
    public function ensureTenantUser(Tenant $tenant): string
    {
        $response = $this->request($tenant, 'ensure-user');
        $result = (string) ($response['result'] ?? '');

        if (! in_array($result, ['seeded', 'skipped'], true)) {
            throw new RuntimeException('Ensure user API did not return a valid result.');
        }

        return $result;
    }

    private function callStageEndpoint(Tenant $tenant, string $stage): void
    {
        $this->request($tenant, $stage);
    }

    /**
     * Resolve target application, obtain a short-lived access token, then call
     * the requested setup endpoint for the tenant.
     *
     * @return array<string, mixed>
     */
    private function request(Tenant $tenant, string $endpoint): array
    {
        $applicationCode = $tenant->relationLoaded('application')
            ? $tenant->application?->code
            : $tenant->application()->first()?->code;

        if (! is_string($applicationCode) || $applicationCode === '') {
            throw new RuntimeException('Tenant has no application configured.');
        }

        // Internal setup API credentials and request timeout.
        // - issuer: identifies this caller to vetmanagementsystem
        // - shared_secret: used to HMAC-sign token request headerscan update
        // - timeout_seconds: max wait for token/setup HTTP calls
        $issuer = (string) config('tenant_applications.internal_api.issuer', 'tenant-management');
        $secret = (string) config('tenant_applications.internal_api.shared_secret', '');
        $timeout = (int) config('tenant_applications.internal_api.timeout_seconds', 120);

        if ($secret === '') {
            throw new RuntimeException('Internal setup API shared secret is not configured.');
        }

        $baseUrls = $this->resolveCandidateBaseUrls($tenant, $applicationCode);
        $failures = [];

        /**
         * Try each candidate URL in order. Continue fallback for token endpoint
         * 404/connection errors because those usually indicate wrong host/scheme
         * in multi-tenant local environments.
         */
        foreach ($baseUrls as $baseUrl) {
            try {
                $token = $this->requestAccessToken($baseUrl, $issuer, $secret, $timeout);
            } catch (RuntimeException $exception) {
                $message = $exception->getMessage();
                $failures[] = "[{$baseUrl}] {$message}";

                if (str_contains($message, '(HTTP 404)') || str_contains($message, 'Failed to connect to internal setup token endpoint')) {
                    continue;
                }

                throw $exception;
            }

            $url = rtrim($baseUrl, '/')."/api/internal/tenant-setup/tenants/{$tenant->id}/{$endpoint}";
            $response = Http::withToken($token)
                ->timeout($timeout)
                ->acceptJson()
                ->post($url);

            $data = $response->json();
            if (! $response->successful()) {
                $message = is_array($data) ? (string) ($data['message'] ?? 'Internal setup API request failed.') : 'Internal setup API request failed.';
                throw new RuntimeException($message);
            }

            if (! is_array($data) || (($data['ok'] ?? false) !== true)) {
                throw new RuntimeException('Internal setup API returned an invalid response.');
            }

            return $data;
        }

        $failureMessage = $failures === []
            ? 'Unable to resolve any internal setup API base URL.'
            : 'Failed to request internal setup access token. Attempts: '.implode(' | ', $failures);

        throw new RuntimeException($failureMessage);
    }

    /**
     * Build prioritized API base URLs:
     * 1) tenant explicit setup_api_base_url
     * 2) tenant first domain
     * 3) application-level fallback from config
     *
     * For local ergonomics, add an HTTP variant when a candidate is HTTPS.
     *
     * @return array<int, string>
     */
    private function resolveCandidateBaseUrls(Tenant $tenant, string $applicationCode): array
    {
        $candidates = [];

        $tenantSpecific = (string) ($tenant->setup_api_base_url ?? '');
        if ($tenantSpecific !== '') {
            $candidates[] = $this->normalizeUrl($tenantSpecific);
        }

        $tenantDomain = $tenant->relationLoaded('domains')
            ? (string) ($tenant->domains?->first()?->domain ?? '')
            : (string) ($tenant->domains()->first()?->domain ?? '');
        if ($tenantDomain !== '') {
            $candidates[] = $this->normalizeUrl($tenantDomain);
        }

        $baseUrls = config('tenant_applications.api_base_urls', []);
        $applicationBaseUrl = $baseUrls[$applicationCode] ?? null;
        if (! is_string($applicationBaseUrl) || $applicationBaseUrl === '') {
            throw new RuntimeException("API base URL is not configured for application [{$applicationCode}].");
        }

        $candidates[] = $this->normalizeUrl($applicationBaseUrl);

        $expandedCandidates = [];
        foreach ($candidates as $candidate) {
            $expandedCandidates[] = $candidate;

            if (str_starts_with($candidate, 'https://')) {
                $expandedCandidates[] = 'http://'.substr($candidate, strlen('https://'));
            }
        }

        return array_values(array_unique($expandedCandidates));
    }

    /**
     * Normalize host/domain into absolute URL.
     */
    private function normalizeUrl(string $url): string
    {
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        $configuredDefaultScheme = (string) config('tenant_applications.internal_api.default_scheme', 'http');
        $fallbackScheme = parse_url((string) config('app.url', ''), PHP_URL_SCHEME);
        $scheme = $configuredDefaultScheme !== ''
            ? $configuredDefaultScheme
            : (is_string($fallbackScheme) && $fallbackScheme !== '' ? $fallbackScheme : 'https');

        return $scheme.'://'.$url;
    }

    /**
     * Request short-lived bearer token from internal setup token endpoint.
     */
    private function requestAccessToken(string $baseUrl, string $issuer, string $secret, int $timeout): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$issuer}|{$timestamp}", $secret);
        $tokenUrl = rtrim($baseUrl, '/').'/api/internal/tenant-setup/token';

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Setup-Issuer' => $issuer,
                    'X-Internal-Setup-Timestamp' => (string) $timestamp,
                    'X-Internal-Setup-Signature' => $signature,
                ])
                ->post($tokenUrl);
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                "Failed to connect to internal setup token endpoint [{$tokenUrl}]: {$exception->getMessage()}",
                previous: $exception
            );
        }

        $data = $response->json();
        if (! $response->successful()) {
            $serverMessage = is_array($data) ? (string) ($data['message'] ?? '') : '';
            $message = "Failed to request internal setup access token from [{$tokenUrl}] (HTTP {$response->status()}).";
            if ($serverMessage !== '') {
                $message .= " Response: {$serverMessage}";
            }
            throw new RuntimeException($message);
        }

        $token = is_array($data) ? (string) ($data['access_token'] ?? '') : '';
        if ($token === '') {
            throw new RuntimeException('Internal setup token endpoint returned no access token.');
        }

        return $token;
    }
}
