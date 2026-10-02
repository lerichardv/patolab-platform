<?php

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);
});

test('customers can be created with duplicate rtn/id_number', function () {
    // Arrange
    Customer::create([
        'name' => 'First Customer',
        'id_number' => '0801-1990-12345',
        'type' => 'cliente',
    ]);

    // Act
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Second Customer',
            'id_number' => '0801-1990-12345', // Duplicate
            'type' => 'cliente',
            'phone' => '9999-9999',
            'email' => 'test@example.com',
        ]);

    // Assert
    $response->assertRedirect();
    $this->assertDatabaseCount('customers', 2);
    $customers = Customer::where('id_number', '0801-1990-12345')->get();
    expect($customers)->toHaveCount(2);
});

test('customer can be updated to share rtn/id_number of another customer', function () {
    // Arrange
    $customer1 = Customer::create([
        'name' => 'Customer One',
        'id_number' => '0801-1990-11111',
        'type' => 'cliente',
    ]);

    $customer2 = Customer::create([
        'name' => 'Customer Two',
        'id_number' => '0801-1990-22222',
        'type' => 'cliente',
    ]);

    // Act
    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer2->id), [
            'name' => 'Customer Two Updated',
            'id_number' => '0801-1990-11111', // Duplicate of Customer One
            'type' => 'cliente',
            'phone' => '9999-9999',
        ]);

    // Assert
    $response->assertRedirect();
    $customer2->refresh();
    expect($customer2->id_number)->toBe('0801-1990-11111');
});

test('customer can be created with age and age_unit', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Pediatric Patient',
            'id_number' => '0801-2024-00001',
            'type' => 'cliente',
            'age' => 5,
            'age_unit' => 'months',
            'phone' => '8888-8888',
            'email' => 'baby@example.com',
        ]);

    $response->assertRedirect();
    $customer = Customer::where('id_number', '0801-2024-00001')->first();
    expect($customer)->not->toBeNull()
        ->and($customer->age)->toBe(5)
        ->and($customer->age_unit)->toBe('months')
        ->and($customer->formatted_age)->toBe('5 meses');

    $response->assertSessionHas('created_customer', function ($payload) {
        return $payload['age'] === 5 && $payload['age_unit'] === 'months';
    });
});

test('customer age_unit defaults to years when not specified', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Adult Patient',
            'id_number' => '0801-1995-00002',
            'type' => 'cliente',
            'age' => 30,
            'phone' => '8888-8889',
            'email' => 'adult@example.com',
        ]);

    $response->assertRedirect();
    $customer = Customer::where('id_number', '0801-1995-00002')->first();
    expect($customer)->not->toBeNull()
        ->and($customer->age)->toBe(30)
        ->and($customer->age_unit)->toBe('years')
        ->and($customer->formatted_age)->toBe('30 años');
});

test('customer can be updated with different age_unit', function () {
    $customer = Customer::create([
        'name' => 'Infant Patient',
        'id_number' => '0801-2025-00003',
        'type' => 'cliente',
        'age' => 15,
        'age_unit' => 'days',
        'phone' => '8888-8880',
        'email' => 'infant@example.com',
    ]);

    expect($customer->formatted_age)->toBe('15 días');

    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Infant Patient Updated',
            'id_number' => '0801-2025-00003',
            'type' => 'cliente',
            'age' => 1,
            'age_unit' => 'months',
            'phone' => '8888-8880',
            'email' => 'infant@example.com',
        ]);

    $response->assertRedirect();
    $customer->refresh();
    expect($customer->age)->toBe(1)
        ->and($customer->age_unit)->toBe('months')
        ->and($customer->formatted_age)->toBe('1 mes');
});

test('customer validation fails if age_unit is invalid', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Invalid Patient',
            'id_number' => '0801-1990-00004',
            'type' => 'cliente',
            'age' => 10,
            'age_unit' => 'centuries',
            'phone' => '8888-8881',
            'email' => 'invalid@example.com',
        ]);

    $response->assertSessionHasErrors(['age_unit']);
});
