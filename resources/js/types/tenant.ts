/** Tenant shape from server (App\Models\Tenant). */
export type Tenant = {
    id: string;
    subscription_plan_id: string;
    name: string;
    database_name: string;
    database_username: string;
    database_password: string;
    database_host: string;
    database_port: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};
