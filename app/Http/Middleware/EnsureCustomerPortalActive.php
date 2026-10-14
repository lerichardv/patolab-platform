<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerPortalActive
{
    /**
     * Handle an incoming request.
     *
     * Ensures that the authenticated customer account is active and has portal access enabled.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $customer = $request->user('customer');

        if (! $customer || ! $customer->active || ! $customer->portal_access) {
            Auth::guard('customer')->logout();

            if ($request->hasSession()) {
                $intended = $request->session()->get('url.intended');
                if (is_string($intended) && str_contains($intended, '/portal')) {
                    $request->session()->forget('url.intended');
                }
            }

            return redirect()->route('customer-portal.login')->withErrors([
                'email' => 'Su cuenta se encuentra inactiva o no tiene acceso habilitado al portal de clientes.',
            ]);
        }

        return $next($request);
    }
}
