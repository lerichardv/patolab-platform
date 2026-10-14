<?php

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('guest can view customer portal login page', function () {
    $response = $this->get(route('customer-portal.login'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('customers/customer-portal/login'));
});

test('customer can login with valid email and password', function () {
    $customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->post(route('customer-portal.login.store'), [
        'email' => 'juan@example.com',
        'password' => 'secret123',
    ]);

    $response->assertRedirect(route('customer-portal.dashboard'));
    expect(Auth::guard('customer')->check())->toBeTrue();
    expect(Auth::guard('customer')->id())->toBe($customer->id);
    expect(Auth::guard('web')->check())->toBeFalse(); // Admin guard must remain unauthenticated
});

test('customer cannot login with incorrect password', function () {
    Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->post(route('customer-portal.login.store'), [
        'email' => 'juan@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');
    expect(Auth::guard('customer')->check())->toBeFalse();
});

test('customer cannot login if portal_access is disabled', function () {
    Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => false,
        'active' => true,
    ]);

    $response = $this->post(route('customer-portal.login.store'), [
        'email' => 'juan@example.com',
        'password' => 'secret123',
    ]);

    $response->assertSessionHasErrors('email');
    expect(Auth::guard('customer')->check())->toBeFalse();
});

test('customer cannot login if active is false', function () {
    Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => false,
    ]);

    $response = $this->post(route('customer-portal.login.store'), [
        'email' => 'juan@example.com',
        'password' => 'secret123',
    ]);

    $response->assertSessionHasErrors('email');
    expect(Auth::guard('customer')->check())->toBeFalse();
});

test('customer can logout from portal', function () {
    $customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $this->actingAs($customer, 'customer');

    expect(Auth::guard('customer')->check())->toBeTrue();

    $response = $this->post(route('customer-portal.logout'));

    $response->assertRedirect(route('customer-portal.login'));
    expect(Auth::guard('customer')->check())->toBeFalse();
});

test('customer portal logout does not logout admin web session', function () {
    $role = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'Admin']);
    $user = User::factory()->create(['role_id' => $role->id, 'active' => true]);

    $customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801-1995-12345',
        'type' => 'cliente',
        'phone' => '9988-7766',
        'email' => 'juan@example.com',
        'password' => Hash::make('secret123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $this->actingAs($user, 'web');
    $this->actingAs($customer, 'customer');

    expect(Auth::guard('web')->check())->toBeTrue();
    expect(Auth::guard('customer')->check())->toBeTrue();

    $response = $this->post(route('customer-portal.logout'));

    $response->assertRedirect(route('customer-portal.login'));
    expect(Auth::guard('customer')->check())->toBeFalse();
    expect(Auth::guard('web')->check())->toBeTrue();
});

test('customer can login even if older inactive customer record exists with same email', function () {
    // Older inactive record without portal access
    Customer::create([
        'name' => 'Old Ricardo',
        'id_number' => '0801-1994-15998',
        'type' => 'cliente',
        'phone' => '3366-6885',
        'email' => 'ricardo@example.com',
        'password' => null,
        'portal_access' => false,
        'active' => false,
    ]);

    // Active record with portal access
    $activeCustomer = Customer::create([
        'name' => 'Active Ricardo',
        'id_number' => '0801-1994-15998',
        'type' => 'cliente',
        'phone' => '3366-6885',
        'email' => 'ricardo@example.com',
        'password' => Hash::make('12345678'),
        'portal_access' => true,
        'active' => true,
    ]);

    $response = $this->post(route('customer-portal.login.store'), [
        'email' => 'ricardo@example.com',
        'password' => '12345678',
    ]);

    $response->assertRedirect(route('customer-portal.dashboard'));
    expect(Auth::guard('customer')->check())->toBeTrue();
    expect(Auth::guard('customer')->id())->toBe($activeCustomer->id);
});
