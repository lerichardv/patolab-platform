<?php

use App\Models\Customer;
use App\Models\Cutting;
use App\Models\CuttingCode;
use App\Models\CuttingPrefix;
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
use App\Models\WorkOrderType;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $managePermission = Permission::create(['slug' => 'cuttings.manage', 'name' => 'Gestionar Cortes']);
    $this->adminRole->permissions()->attach($managePermission);

    $this->code = CuttingCode::create(['code' => 'A', 'color' => '#FF0000']);
    $this->prefix = CuttingPrefix::create(['prefix' => 'B']);
    $this->slideType = WorkOrderType::create(['name' => 'Lámina H&E']);

    $this->customer = Customer::create([
        'name' => 'Test Patient',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'masculino',
        'type' => 'cliente',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Médico Referidor', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Test', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#22c55e', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'BIO', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Biopsia General',
        'specimen_type' => $this->type->id,
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-09-2026',
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'customer' => $this->customer->id,
        'status' => 'received',
    ]);
});

test('unauthenticated users cannot access cutting form data', function () {
    $this->getJson(route('cuttings.form-data'))
        ->assertUnauthorized();
});

test('users without proper permissions cannot access cutting form data', function () {
    $limitedRole = Role::create(['slug' => 'limited', 'name' => 'Limited']);
    $limitedUser = User::factory()->create([
        'role_id' => $limitedRole->id,
        'active' => true,
    ]);

    $this->actingAs($limitedUser)
        ->getJson(route('cuttings.form-data'))
        ->assertForbidden();
});

test('users with my_assignments.view or specimens.view can access cutting form data', function () {
    $pathologistRole = Role::create(['slug' => 'pathologist', 'name' => 'Pathologist']);
    $perm = Permission::create(['slug' => 'my_assignments.view', 'name' => 'Mis Asignaciones']);
    $pathologistRole->permissions()->attach($perm);

    $pathologistUser = User::factory()->create([
        'role_id' => $pathologistRole->id,
        'active' => true,
    ]);

    $this->actingAs($pathologistUser)
        ->getJson(route('cuttings.form-data'))
        ->assertOk()
        ->assertJsonStructure([
            'cuttingCodes',
            'cuttingPrefixes',
            'cuttingSlideTypes',
            'users',
        ]);
});

test('endpoint returns catalogs correctly', function () {
    $this->actingAs($this->user)
        ->getJson(route('cuttings.form-data'))
        ->assertOk()
        ->assertJsonStructure([
            'cuttingCodes',
            'cuttingPrefixes',
            'cuttingSlideTypes',
            'users',
            'cuttings',
            'specimen',
        ]);

    $response = $this->actingAs($this->user)->getJson(route('cuttings.form-data'));
    $data = $response->json();

    expect($data['cuttingCodes'])->toBeArray()->toHaveCount(1)
        ->and($data['cuttingCodes'][0]['code'])->toBe('A')
        ->and($data['cuttingPrefixes'])->toBeArray()->toHaveCount(1)
        ->and($data['cuttingPrefixes'][0]['prefix'])->toBe('B')
        ->and($data['cuttingSlideTypes'])->toBeArray()->toHaveCount(1)
        ->and($data['cuttingSlideTypes'][0]['name'])->toBe('Lámina H&E')
        ->and($data['users'])->toBeArray()->not->toBeEmpty();
});

test('endpoint returns specimen cuttings when specimen_id is provided', function () {
    $cutting = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->code->id,
        'description' => 'Muestra de prueba',
        'number_of_cuttings' => 1,
        'cuttings_description' => '',
        'number_of_slides' => 1,
        'cutting_slide_types' => [$this->slideType->id],
        'comments' => null,
        'responsible_id' => $this->user->id,
        'status' => 'macroscopy',
        'prefix_id' => $this->prefix->id,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('cuttings.form-data', ['specimen_id' => $this->specimen->id]))
        ->assertOk();

    $data = $response->json();

    expect($data['cuttings'])->toBeArray()->toHaveCount(1)
        ->and($data['cuttings'][0]['id'])->toBe($cutting->id)
        ->and($data['cuttings'][0]['code']['code'])->toBe('A')
        ->and($data['cuttings'][0]['prefix']['prefix'])->toBe('B')
        ->and($data['cuttings'][0]['responsible']['id'])->toBe($this->user->id)
        ->and($data['specimen']['sequence_code'])->toBe('BIO-0001-09-2026');
});
