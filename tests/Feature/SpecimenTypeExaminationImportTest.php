<?php

use App\Models\Role;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
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

    // Create a specimen type for name resolution
    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);
});

test('unauthenticated users cannot view or post import endpoints', function () {
    $this->get(route('specimen-type-examinations.import-page'))->assertRedirect(route('login'));
    $this->post(route('specimen-type-examinations.import-parse'))->assertRedirect(route('login'));
    $this->post(route('specimen-type-examinations.import-row'))->assertRedirect(route('login'));
});

test('authenticated admin can view the specimen type examinations import page', function () {
    $response = $this->actingAs($this->user)->get(route('specimen-type-examinations.import-page'));
    $response->assertOk();
});

test('can parse uploaded csv spreadsheet file successfully', function () {
    $csvContent = "Tipo de Muestra,Nombre del Análisis,Descripción,Precio\n"
        ."Biopsia,Biopsia de Piel,Estudio histopatológico de piel,350.00\n";

    $file = UploadedFile::fake()->createWithContent('examinations.csv', $csvContent);

    $response = $this->actingAs($this->user)
        ->post(route('specimen-type-examinations.import-parse'), [
            'file' => $file,
        ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'headers',
        'rows',
    ]);

    $data = $response->json();
    $this->assertEquals(['Tipo de Muestra', 'Nombre del Análisis', 'Descripción', 'Precio'], $data['headers']);
    $this->assertCount(1, $data['rows']);
    $this->assertEquals('Biopsia', $data['rows'][0][0]);
});

test('can import single row, resolving specimen type name to ID, and setting active and price', function () {
    $payload = [
        'specimen_type' => 'BIOPSIA', // Case insensitive lookup
        'name' => 'Biopsia de Piel',
        'description' => 'Estudio histopatológico de piel',
        'price' => '350.00',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('specimen-type-examinations.import-row'), $payload);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
    ]);

    $exam = SpecimenTypeExamination::where('name', 'Biopsia de Piel')->first();
    $this->assertNotNull($exam);
    $this->assertEquals($this->specimenType->id, $exam->specimen_type);
    $this->assertEquals('Estudio histopatológico de piel', $exam->description);
    $this->assertTrue($exam->active);

    // Verify price creation
    $price = $exam->prices()->first();
    $this->assertNotNull($price);
    $this->assertEquals(350.00, $price->amount);
});

test('importing row fails when required fields are missing or invalid', function () {
    // Missing required field: name
    $payload = [
        'specimen_type' => 'Biopsia',
        'description' => 'Estudio histopatológico de piel',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('specimen-type-examinations.import-row'), $payload);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
    ]);
    $response->assertJsonStructure(['errors' => ['name']]);
});

test('importing row fails when specimen type cannot be resolved', function () {
    $payload = [
        'specimen_type' => 'Non Existent Type',
        'name' => 'Biopsia de Piel',
        'description' => 'Estudio histopatológico de piel',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('specimen-type-examinations.import-row'), $payload);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
    ]);
    $response->assertJsonStructure(['errors' => ['specimen_type']]);
});
