<?php

use App\Models\Laboratory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['active' => true]);
});

test('unauthenticated users cannot access laboratories endpoints', function () {
    $this->getJson('/laboratories')->assertStatus(401);
    $this->postJson('/laboratories', ['name' => 'Lab Test'])->assertStatus(401);
});

test('authenticated user can list active laboratories ordered with default first', function () {
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

test('authenticated user can store a new laboratory', function () {
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
