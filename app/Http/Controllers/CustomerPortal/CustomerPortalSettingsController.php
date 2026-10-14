<?php

namespace App\Http\Controllers\CustomerPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class CustomerPortalSettingsController extends Controller
{
    /**
     * Show the profile information page for the customer.
     */
    public function editProfile(Request $request): Response
    {
        $customer = $request->user('customer');

        return Inertia::render('customers/customer-portal/settings/profile', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'id_number' => $customer->id_number,
                'phone' => $customer->phone,
                'secondary_phone' => $customer->secondary_phone,
                'type' => $customer->type,
                'address' => $customer->address,
                'formatted_age' => $customer->formatted_age,
                'gender' => $customer->gender,
                'last_portal_login_at' => $customer->last_portal_login_at?->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Show the password change page.
     */
    public function editPassword(): Response
    {
        return Inertia::render('customers/customer-portal/settings/password');
    }

    /**
     * Update the customer's password.
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $customer = $request->user('customer');

        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password:customer'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ]);

        $customer->update([
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()->back()->with('status', 'Contraseña actualizada con éxito.');
    }
}
