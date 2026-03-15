/** Domain shape from server (App\Models\Domain). */
export type TenantDomain = {
    id: number;
    domain: string;
};

/** Tenant shape from server (App\Models\Tenant). */
export type Tenant = {
    id: string;
    subscription_plan_id: string;
    name: string;
    host: string | null;
    domains?: TenantDomain[];
    storage_domain: string;
    application_id?: number | null;
    application?: { id: number; code: string; name: string } | null;
    database_name: string;
    database_username: string;
    database_password: string;
    database_host: string;
    database_port: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
};
