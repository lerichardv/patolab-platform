<?php

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('customer cannot access admin dashboard and is redirected or forbidden', function () {
    $customer = Customer::create([
        'name' => 'Paciente Portal',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'paciente@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => true,
    ]);

    // Customer authenticated on 'customer' guard tries to visit admin dashboard
    $response = $this->actingAs($customer, 'customer')
        ->get(route('dashboard'));

    // Admin route requires auth:web; customer must be redirected to admin login or rejected
    $response->assertRedirect('/login');
});

test('customer cannot access admin specimens route', function () {
    $customer = Customer::create([
        'name' => 'Paciente Portal',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'paciente@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->actingAs($customer, 'customer')
        ->get(route('specimens.index'));

    $response->assertRedirect('/login');
});

test('unauthenticated guest attempting to access portal is redirected to portal login', function () {
    $response = $this->get(route('customer-portal.dashboard'));

    $response->assertRedirect(route('customer-portal.login'));
});

test('staff user without customer login cannot access portal directly', function () {
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    // Authenticated on 'web' guard, but not 'customer' guard
    $response = $this->actingAs($user, 'web')
        ->get(route('customer-portal.dashboard'));

    $response->assertRedirect(route('customer-portal.login'));
});
