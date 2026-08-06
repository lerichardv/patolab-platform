<?php

use App\Models\CuttingPrefix;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->pathologistRole = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);

    $permissions = [
        Permission::create(['slug' => 'cutting_prefixes.view', 'name' => 'Ver Prefijos']),
        Permission::create(['slug' => 'cutting_prefixes.create', 'name' => 'Crear Prefijos']),
        Permission::create(['slug' => 'cutting_prefixes.edit', 'name' => 'Editar Prefijos']),
        Permission::create(['slug' => 'cutting_prefixes.delete', 'name' => 'Eliminar Prefijos']),
    ];

    foreach ($permissions as $p) {
        $this->pathologistRole->permissions()->attach($p);
    }

    $this->user = User::factory()->create([
        'role_id' => $this->pathologistRole->id,
        'active' => true,
    ]);
});

test('user can view listing of cutting prefixes', function () {
    CuttingPrefix::create(['prefix' => 'C']);

    $response = $this->actingAs($this->user)
        ->get(route('cutting-prefixes.index'));

    $response->assertOk();
});

test('user can store a single cutting prefix', function () {
    $response = $this->actingAs($this->user)
        ->post(route('cutting-prefixes.store'), [
            'prefix' => 'H',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cutting_prefixes', [
        'prefix' => 'H',
    ]);
});

test('user can store multiple cutting prefixes in bulk', function () {
    $response = $this->actingAs($this->user)
        ->post(route('cutting-prefixes.store'), [
            'prefixes' => [
                ['prefix' => 'C1'],
                ['prefix' => 'C2'],
            ],
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cutting_prefixes', ['prefix' => 'C1']);
    $this->assertDatabaseHas('cutting_prefixes', ['prefix' => 'C2']);
});

test('user can update a cutting prefix', function () {
    $prefix = CuttingPrefix::create(['prefix' => 'C']);

    $response = $this->actingAs($this->user)
        ->put(route('cutting-prefixes.update', $prefix->id), [
            'prefix' => 'C_NEW',
        ]);

    $response->assertRedirect();
    $prefix->refresh();
    expect($prefix->prefix)->toBe('C_NEW');
});

test('user can delete a cutting prefix', function () {
    $prefix = CuttingPrefix::create(['prefix' => 'C']);

    $response = $this->actingAs($this->user)
        ->delete(route('cutting-prefixes.destroy', $prefix->id));

    $response->assertRedirect();
    $this->assertDatabaseMissing('cutting_prefixes', [
        'id' => $prefix->id,
    ]);
});
