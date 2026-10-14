<?php

namespace App\Http\Middleware;

use App\Models\Permission;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'debugReport' => filter_var(env('DEBUG_REPORT', false), FILTER_VALIDATE_BOOLEAN),
            'auth' => [
                'user' => $request->user('web') ? $request->user('web')->load('role') : null,
                'permissions' => $request->user('web') ? ($request->user('web')->role ? ($request->user('web')->role->slug === 'admin' ? Permission::pluck('slug')->toArray() : $request->user('web')->role->permissions->pluck('slug')->toArray()) : []) : [],
                'customer' => $request->user('customer') ? [
                    'id' => $request->user('customer')->id,
                    'name' => $request->user('customer')->name,
                    'email' => $request->user('customer')->email,
                    'id_number' => $request->user('customer')->id_number,
                    'phone' => $request->user('customer')->phone,
                    'type' => $request->user('customer')->type,
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => $request->session()->get('success'),
                'new_specimen_id' => $request->session()->get('new_specimen_id'),
                'new_invoice_id' => $request->session()->get('new_invoice_id'),
                'new_invoice_url' => $request->session()->get('new_invoice_url'),
                'new_payment_invoice_url' => $request->session()->get('new_payment_invoice_url'),
                'created_customer' => $request->session()->get('created_customer'),
                'created_referrer' => $request->session()->get('created_referrer'),
                'updated_referrer' => $request->session()->get('updated_referrer'),
                'new_purchase_order_url' => $request->session()->get('new_purchase_order_url'),
                'new_price_quote_url' => $request->session()->get('new_price_quote_url'),
            ],
        ];
    }
}
