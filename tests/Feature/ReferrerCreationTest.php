<?php

use App\Models\Permission;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('storing a referrer flashes created_referrer in session for redirect', function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $permission = Permission::create(['slug' => 'referrers.create', 'name' => 'Crear Remitentes']);
    $role->permissions()->attach($permission);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create(['name' => 'Doctor', 'active' => true]);

    $response = $this->actingAs($user)->post(route('referrers.store'), [
        'name' => 'Dr. Gregory House',
        'referrer_type' => $referrerType->id,
        'notes' => 'Princeton-Plainsboro',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('created_referrer');

    $this->assertDatabaseHas('referrers', [
        'name' => 'Dr. Gregory House',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);
});

test('storing a referrer returns JSON with type when requested via JSON', function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $permission = Permission::create(['slug' => 'referrers.create', 'name' => 'Crear Remitentes']);
    $role->permissions()->attach($permission);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create(['name' => 'Doctor', 'active' => true]);

    $response = $this->actingAs($user)->postJson(route('referrers.store'), [
        'name' => 'Dr. John Watson',
        'referrer_type' => $referrerType->id,
        'notes' => 'Baker Street',
    ]);

    $response->assertOk()
        ->assertJsonPath('name', 'Dr. John Watson')
        ->assertJsonPath('type.name', 'Doctor');
});

test('index returns all active referrers when requested via JSON', function () {
    $role = Role::create(['slug' => 'doctor', 'name' => 'Doctor']);
    $permission = Permission::create(['slug' => 'specimens.create', 'name' => 'Crear Muestras']);
    $role->permissions()->attach($permission);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create(['name' => 'Doctor', 'active' => true]);
    Referrer::create([
        'name' => 'Dr. Stephen Strange',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);

    $response = $this->actingAs($user)->getJson(route('referrers.index'));

    $response->assertOk()
        ->assertJsonFragment(['name' => 'Dr. Stephen Strange']);
});
