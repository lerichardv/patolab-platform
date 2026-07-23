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
