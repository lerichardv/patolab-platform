<?php

use App\Models\Role;
use App\Models\SpecimenType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Setup admin user to bypass gates
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);
});

test('unauthenticated users cannot view or post import endpoints', function () {
    $this->get(route('specimen-types.import-page'))->assertRedirect(route('login'));
    $this->post(route('specimen-types.import-parse'))->assertRedirect(route('login'));
    $this->post(route('specimen-types.import-row'))->assertRedirect(route('login'));
});

test('authenticated admin can view the specimen types import page', function () {
    $response = $this->actingAs($this->user)->get(route('specimen-types.import-page'));
    $response->assertOk();
});

test('can parse uploaded csv spreadsheet file successfully', function () {
    $csvContent = "Nombre,Descripción\n"
        ."Biopsia,Estudio histopatológico de tejido\n";

    $file = UploadedFile::fake()->createWithContent('specimen_types.csv', $csvContent);

    $response = $this->actingAs($this->user)
        ->post(route('specimen-types.import-parse'), [
            'file' => $file,
        ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'headers',
        'rows',
    ]);

    $data = $response->json();
    $this->assertEquals(['Nombre', 'Descripción'], $data['headers']);
    $this->assertCount(1, $data['rows']);
    $this->assertEquals('Biopsia', $data['rows'][0][0]);
});

test('can import single row and normalize data', function () {
    $payload = [
        'name' => 'Citología',
        'description' => 'Estudio de células',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('specimen-types.import-row'), $payload);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
    ]);

    $type = SpecimenType::where('name', 'Citología')->first();
    $this->assertNotNull($type);
    $this->assertEquals('Estudio de células', $type->description);
    $this->assertTrue($type->active);
});

test('importing row fails when required fields are missing or invalid', function () {
    // Missing required field: name
    $payload = [
        'description' => 'Test description',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('specimen-types.import-row'), $payload);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
    ]);
    $response->assertJsonStructure(['errors' => ['name']]);
});

test('importing row fails when name is not unique', function () {
    SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $payload = [
        'name' => 'Biopsia',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('specimen-types.import-row'), $payload);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
    ]);
    $response->assertJsonStructure(['errors' => ['name']]);
});
