<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the authenticated user is enabled (is_enabled = true).
 * If the user is disabled, terminates the session and redirects to login with a query
 * param so the login page can show a SweetAlert that the account was disabled.
 */
class EnsureUserIsEnabled
{
    /**
     * If the authenticated user is disabled: logout, invalidate session, regenerate
     * CSRF token, and redirect to login with account_disabled=1 for the alert.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check() && ! auth()->user()->is_enabled) {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login', ['account_disabled' => 1]);
        }

        return $next($request);
    }
}
