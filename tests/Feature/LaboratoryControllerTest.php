<?php

use App\Models\Laboratory;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $permissions = [
        Permission::create(['slug' => 'laboratories.view', 'name' => 'Ver Laboratorios']),
        Permission::create(['slug' => 'laboratories.create', 'name' => 'Crear Laboratorios']),
        Permission::create(['slug' => 'laboratories.edit', 'name' => 'Editar Laboratorios']),
        Permission::create(['slug' => 'laboratories.delete', 'name' => 'Eliminar Laboratorios']),
    ];
    $role->permissions()->attach(collect($permissions)->pluck('id'));

    $this->user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);
});

test('unauthenticated users cannot access laboratories endpoints', function () {
    $this->get('/laboratories')->assertRedirect('/login');
    $this->getJson('/laboratories')->assertStatus(401);
    $this->postJson('/laboratories', ['name' => 'Lab Test'])->assertStatus(401);
});

test('authenticated user can view laboratories inertia management page', function () {
    Laboratory::create([
        'name' => 'Laboratorio Patolab',
        'is_default' => true,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->get('/laboratories');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('laboratories/index')
        ->has('laboratories.data', 1)
        ->has('filters')
    );
});

test('authenticated user can filter laboratories by search term on inertia page', function () {
    Laboratory::create(['name' => 'Laboratorio Alfa', 'is_default' => false, 'is_active' => true]);
    Laboratory::create(['name' => 'Laboratorio Beta', 'is_default' => false, 'is_active' => true]);

    $response = $this->actingAs($this->user)->get('/laboratories?search=Alfa');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('laboratories/index')
        ->has('laboratories.data', 1)
        ->where('laboratories.data.0.name', 'Laboratorio Alfa')
    );
});

test('authenticated user can list active laboratories as JSON with default first', function () {
    $defaultLab = Laboratory::create([
        'name' => 'Laboratorio Patolab',
        'is_default' => true,
        'is_active' => true,
    ]);

    $labB = Laboratory::create([
        'name' => 'Laboratorio Beta',
        'is_default' => false,
        'is_active' => true,
    ]);

    $labA = Laboratory::create([
        'name' => 'Laboratorio Alfa',
        'is_default' => false,
        'is_active' => true,
    ]);

    Laboratory::create([
        'name' => 'Laboratorio Inactivo',
        'is_default' => false,
        'is_active' => false,
    ]);

    $response = $this->actingAs($this->user)->getJson('/laboratories');

    $response->assertStatus(200);
    $data = $response->json('data');

    expect($data)->toHaveCount(3)
        ->and($data[0]['name'])->toBe('Laboratorio Patolab')
        ->and($data[1]['name'])->toBe('Laboratorio Alfa')
        ->and($data[2]['name'])->toBe('Laboratorio Beta');
});

test('authenticated user can store a new laboratory via JSON', function () {
    $response = $this->actingAs($this->user)->postJson('/laboratories', [
        'name' => 'Centro Médico del Valle',
    ]);

    $response->assertStatus(201);
    $response->assertJsonPath('data.name', 'Centro Médico del Valle');
    $response->assertJsonPath('data.is_default', false);
    $response->assertJsonPath('data.is_active', true);

    $this->assertDatabaseHas('laboratories', [
        'name' => 'Centro Médico del Valle',
    ]);
});

test('authenticated user can store a new laboratory and make it default', function () {
    $existing = Laboratory::create([
        'name' => 'Laboratorio Antiguo',
        'is_default' => true,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->post('/laboratories', [
        'name' => 'Laboratorio Nuevo Predeterminado',
        'is_default' => true,
        'is_active' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('laboratories', [
        'name' => 'Laboratorio Nuevo Predeterminado',
        'is_default' => true,
    ]);

    expect($existing->fresh()->is_default)->toBeFalse();
});

test('storing laboratory validates name requirement and uniqueness', function () {
    Laboratory::create([
        'name' => 'Laboratorio Existente',
        'is_default' => false,
        'is_active' => true,
    ]);

    $responseEmpty = $this->actingAs($this->user)->postJson('/laboratories', [
        'name' => '',
    ]);
    $responseEmpty->assertStatus(422)->assertJsonValidationErrors(['name']);

    $responseDuplicate = $this->actingAs($this->user)->postJson('/laboratories', [
        'name' => 'Laboratorio Existente',
    ]);
    $responseDuplicate->assertStatus(422)->assertJsonValidationErrors(['name']);
});

test('authenticated user can update an existing laboratory', function () {
    $lab = Laboratory::create([
        'name' => 'Laboratorio Original',
        'is_default' => false,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->put("/laboratories/{$lab->id}", [
        'name' => 'Laboratorio Modificado',
        'is_default' => false,
        'is_active' => false,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('laboratories', [
        'id' => $lab->id,
        'name' => 'Laboratorio Modificado',
        'is_active' => false,
    ]);
});

test('authenticated user can delete a non-default laboratory', function () {
    $lab = Laboratory::create([
        'name' => 'Laboratorio Secundario',
        'is_default' => false,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->delete("/laboratories/{$lab->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('laboratories', ['id' => $lab->id]);
});

test('cannot delete the default laboratory', function () {
    $defaultLab = Laboratory::create([
        'name' => 'Laboratorio Principal',
        'is_default' => true,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->deleteJson("/laboratories/{$defaultLab->id}");

    $response->assertStatus(422);
    $this->assertDatabaseHas('laboratories', ['id' => $defaultLab->id]);
});
