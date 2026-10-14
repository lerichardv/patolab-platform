<?php

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('customer can view password change page', function () {
    $customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('old-password-123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->actingAs($customer, 'customer')
        ->get(route('customer-portal.settings.password'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('customers/customer-portal/settings/password'));
});

test('customer can update password providing correct current password', function () {
    $customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('old-password-123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->actingAs($customer, 'customer')
        ->put(route('customer-portal.settings.password.update'), [
            'current_password' => 'old-password-123',
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ]);

    $response->assertSessionHasNoErrors();
    $customer->refresh();
    expect(Hash::check('new-password-456', $customer->password))->toBeTrue();
});

test('customer cannot update password with invalid current password', function () {
    $customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('old-password-123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->actingAs($customer, 'customer')
        ->put(route('customer-portal.settings.password.update'), [
            'current_password' => 'wrong-password',
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ]);

    $response->assertSessionHasErrors('current_password');
    $customer->refresh();
    expect(Hash::check('old-password-123', $customer->password))->toBeTrue();
});
