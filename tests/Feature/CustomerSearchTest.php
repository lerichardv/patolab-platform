<?php

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);
});

test('customer search finds customer with or without accents', function () {
    $customer = Customer::create([
        'name' => 'Hernán Cortés Gómez',
        'id_number' => '0801199012345',
        'phone' => '99991111',
        'gender' => 'hombre',
        'type' => 'individual',
        'active' => true,
    ]);

    // Search without accents
    $responseNoAccents = $this->actingAs($this->user)->getJson('/customers/search?q=hernan+cortes');
    $responseNoAccents->assertOk();
    $data = $responseNoAccents->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['id'])->toBe($customer->id);

    // Search with accents
    $responseWithAccents = $this->actingAs($this->user)->getJson('/customers/search?q='.urlencode('Hernán Gómez'));
    $responseWithAccents->assertOk();
    $data = $responseWithAccents->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['id'])->toBe($customer->id);
});

test('customer search finds customer by RTN with or without hyphens', function () {
    $customer = Customer::create([
        'name' => 'Carlos Rodriguez',
        'id_number' => '0501-1988-99999',
        'phone' => '99992222',
        'gender' => 'hombre',
        'type' => 'individual',
        'active' => true,
    ]);

    // Search without hyphens
    $response = $this->actingAs($this->user)->getJson('/customers/search?q=0501198899999');
    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['id'])->toBe($customer->id);

    // Search with hyphens
    $responseHyphens = $this->actingAs($this->user)->getJson('/customers/search?q=0501-1988-99999');
    $responseHyphens->assertOk();
    $dataHyphens = $responseHyphens->json('data');
    expect($dataHyphens)->toHaveCount(1);
    expect($dataHyphens[0]['id'])->toBe($customer->id);
});
