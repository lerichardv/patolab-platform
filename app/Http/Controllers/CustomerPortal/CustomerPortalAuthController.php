<?php

namespace App\Http\Controllers\CustomerPortal;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CustomerPortalAuthController extends Controller
{
    /**
     * Show the customer portal login view.
     */
    public function create(): Response|RedirectResponse
    {
        if (Auth::guard('customer')->check()) {
            return redirect()->route('customer-portal.dashboard');
        }

        return Inertia::render('customers/customer-portal/login', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming customer portal authentication request.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = trim((string) $request->input('email'));
        $password = (string) $request->input('password');

        $throttleKey = Str::transliterate(Str::lower($email).'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'email' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => (int) ceil($seconds / 60),
                ]),
            ]);
        }

        $customers = Customer::where('email', $email)->get();

        if ($customers->isEmpty()) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // Find customer with matching password, prioritizing active accounts with portal access
        $customer = $customers
            ->sortByDesc('portal_access')
            ->sortByDesc('active')
            ->sortByDesc('id')
            ->first(function ($c) use ($password) {
                return ! empty($c->password) && Hash::check($password, $c->password);
            });

        if (! $customer) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (! $customer->active || ! $customer->portal_access) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages([
                'email' => 'Su cuenta se encuentra inactiva o no tiene acceso habilitado al portal de clientes.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        Auth::guard('customer')->login($customer, $request->boolean('remember'));

        $customer->forceFill(['last_portal_login_at' => now()])->save();

        $request->session()->regenerate();

        return redirect()->intended(route('customer-portal.dashboard'));
    }

    /**
     * Log the customer out of the portal.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('customer')->logout();

        if ($request->hasSession()) {
            $intended = $request->session()->get('url.intended');
            if (is_string($intended) && str_contains($intended, '/portal')) {
                $request->session()->forget('url.intended');
            }
        }

        return redirect()->route('customer-portal.login');
    }
}
