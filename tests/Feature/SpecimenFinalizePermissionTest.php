<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\ReportPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->permission = Permission::firstOrCreate(
        ['slug' => 'specimens.finalize'],
        ['name' => 'Finalizar Muestras']
    );

    $this->adminRole = Role::firstOrCreate(
        ['slug' => 'admin'],
        ['name' => 'Administrador']
    );

    $this->pathologistRole = Role::firstOrCreate(
        ['slug' => 'pathologist'],
        ['name' => 'Patólogo']
    );

    $this->assistantRole = Role::firstOrCreate(
        ['slug' => 'assistant'],
        ['name' => 'Asistente']
    );

    // Assign finalize permission only to pathologist role for testing
    $this->pathologistRole->permissions()->sync([$this->permission->id]);
    $this->assistantRole->permissions()->sync([]);

    $this->department = Department::create([
        'name' => 'Cortés',
        'code' => '05',
    ]);

    $this->municipality = Municipality::create([
        'department_id' => $this->department->id,
        'name' => 'San Pedro Sula',
        'code' => '0501',
    ]);

    $this->customer = Customer::factory()->create([
        'state' => $this->department->id,
        'city' => $this->municipality->id,
        'name' => 'John Doe',
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Examen General',
        'code' => 'EG',
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Categoría A',
        'quantity' => 1,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Clínica',
    ]);

    $this->referrer = Referrer::create([
        'name' => 'Dr. Smith',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Media',
        'color' => '#f59e0b',
        'order' => 1,
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'microscopic_review',
        'access_token' => 'test-access-token',
        'delivery_token' => 'test-delivery-token',
    ]);
});

test('unauthenticated user cannot check can-finalize permission', function () {
    $response = $this->getJson(route('specimens.can-finalize'));

    $response->assertUnauthorized();
});

test('admin user always has can-finalize permission', function () {
    $admin = User::factory()->create([
        'role_id' => $this->adminRole->id,
    ]);

    $response = $this->actingAs($admin)->getJson(route('specimens.can-finalize'));

    $response->assertOk()
        ->assertJson([
            'can_finalize' => true,
        ]);
});

test('user with specimens.finalize permission gets can_finalize true', function () {
    $user = User::factory()->create([
        'role_id' => $this->pathologistRole->id,
    ]);

    $response = $this->actingAs($user)->getJson(route('specimens.can-finalize'));

    $response->assertOk()
        ->assertJson([
            'can_finalize' => true,
        ]);
});

test('user without specimens.finalize permission gets can_finalize false', function () {
    $user = User::factory()->create([
        'role_id' => $this->assistantRole->id,
    ]);

    $response = $this->actingAs($user)->getJson(route('specimens.can-finalize'));

    $response->assertOk()
        ->assertJson([
            'can_finalize' => false,
        ]);
});

test('user without specimens.finalize permission cannot transition specimen to finalized', function () {
    $user = User::factory()->create([
        'role_id' => $this->assistantRole->id,
        'user_signature' => 'signatures/dummy.png',
    ]);

    // Assign to specimen
    $this->specimen->users()->attach($user->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($user)->post(
        route('specimens.report-editor.transition-state', $this->specimen->sequence_code),
        ['status' => 'finalized']
    );

    $response->assertSessionHasErrors(['error' => 'No tienes permiso para finalizar el reporte de esta muestra.']);

    $this->specimen->refresh();
    expect($this->specimen->status)->toBe('microscopic_review');
});

test('user with specimens.finalize permission can transition specimen to finalized', function () {
    $pdfServiceMock = Mockery::mock(ReportPdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreReport')->andReturn('reports/dummy.pdf');
    app()->instance(ReportPdfService::class, $pdfServiceMock);

    $user = User::factory()->create([
        'role_id' => $this->pathologistRole->id,
        'user_signature' => 'signatures/dummy.png',
    ]);

    // Assign to specimen
    $this->specimen->users()->attach($user->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($user)->post(
        route('specimens.report-editor.transition-state', $this->specimen->sequence_code),
        ['status' => 'finalized']
    );

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    $this->specimen->refresh();
    expect($this->specimen->status)->toBe('finalized');
});
