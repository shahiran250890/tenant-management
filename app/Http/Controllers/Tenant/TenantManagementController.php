<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $tenants = Tenant::all();

        return Inertia::render('tenants/index', [
            'tenants' => $tenants,
            'canAddTenant' => auth()->user()->can('add tenant'),
            'canEditTenant' => auth()->user()->can('edit tenant'),
            'canDeleteTenant' => auth()->user()->can('delete tenant'),
            'canViewTenant' => auth()->user()->can('view tenant'),
            'openModal' => $request->query('modal'),
            'openModalTenantId' => $request->query('tenant_id') ? (int) $request->query('tenant_id') : null,
        ]);
    }
}
