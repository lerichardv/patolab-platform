<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $viewPermission = Permission::create(['slug' => 'specimens.view', 'name' => 'Ver Muestras']);
    $this->adminRole->permissions()->attach($viewPermission);

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
    $this->location = Location::create(['name' => 'Tegucigalpa', 'active' => true]);
    $this->bank = Bank::create(['name' => 'BAC Credomatic']);

    Setting::create(['setting_key' => 'third_age_discount', 'setting_value' => '30', 'description' => 'Descuento tercera edad']);
    Setting::create(['setting_key' => 'fourth_age_discount', 'setting_value' => '40', 'description' => 'Descuento cuarta edad']);
});

test('unauthenticated users cannot access form data', function () {
    $this->getJson(route('specimens.form-data'))
        ->assertUnauthorized();
});

test('users without specimens.view permission cannot access form data', function () {
    $roleWithoutPermission = Role::create(['slug' => 'limited', 'name' => 'Limited']);
    $limitedUser = User::factory()->create([
        'role_id' => $roleWithoutPermission->id,
        'active' => true,
    ]);

    $this->actingAs($limitedUser)
        ->getJson(route('specimens.form-data'))
        ->assertForbidden();
});

test('returns all reference data keys', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('specimens.form-data'))
        ->assertOk()
        ->assertJsonStructure([
            'specimenTypes',
            'examinations',
            'categories',
            'referrers',
            'referrerTypes',
            'priorities',
            'locations',
            'sequences',
            'activeLocationId',
            'products',
            'banks',
            'settings',
        ]);

    $data = $response->json();

    expect($data['specimenTypes'])->toBeArray()->toHaveCount(1);
    expect($data['examinations'])->toBeArray()->toHaveCount(1);
    expect($data['categories'])->toBeArray()->toHaveCount(1);
    expect($data['referrers'])->toBeArray()->toHaveCount(1);
    expect($data['referrerTypes'])->toBeArray()->toHaveCount(1);
    expect($data['priorities'])->toBeArray()->toHaveCount(1);
    expect($data['locations'])->toBeArray()->toHaveCount(1);
    expect($data['banks'])->toBeArray()->toHaveCount(1);
    expect($data['settings'])->toBeArray();
    expect($data['settings']['third_age_discount'])->toBe('30');
    expect($data)->not->toHaveKey('specimen');
});

test('only returns active records', function () {
    SpecimenType::create(['name' => 'Inactive Type', 'code' => 'INX', 'active' => false]);
    Referrer::create(['name' => 'Inactive Referrer', 'active' => false, 'referrer_type' => $this->referrerType->id]);
    SpecimenCategory::create(['name' => 'Inactive Cat', 'quantity' => 1, 'active' => false]);
    Location::create(['name' => 'Inactive Location', 'active' => false]);

    $data = $this->actingAs($this->user)
        ->getJson(route('specimens.form-data'))
        ->assertOk()
        ->json();

    expect($data['specimenTypes'])->toHaveCount(1);
    expect($data['referrers'])->toHaveCount(1);
    expect($data['categories'])->toHaveCount(1);
    expect($data['locations'])->toHaveCount(1);
});

test('returns specimen with relations when specimen_id is provided', function () {
    $specimen = Specimen::create([
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
        'sequence_code' => 'BIO-0001-08-2026',
    ]);

    $data = $this->actingAs($this->user)
        ->getJson(route('specimens.form-data', ['specimen_id' => $specimen->id]))
        ->assertOk()
        ->json();

    expect($data)->toHaveKey('specimen');
    expect($data['specimen']['id'])->toBe($specimen->id);
    expect($data['specimen']['customer_relation'])->not->toBeNull();
    expect($data['specimen']['customer_relation']['name'])->toBe('Test Patient');
});

test('returns 404 when invalid specimen_id is provided', function () {
    $this->actingAs($this->user)
        ->getJson(route('specimens.form-data', ['specimen_id' => 99999]))
        ->assertNotFound();
});

test('returns activeLocationId from active CaiRange', function () {
    CaiRange::create([
        'cai' => 'TEST-CAI-123',
        'location_id' => $this->location->id,
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2028-12-31',
        'status' => 'active',
    ]);

    $data = $this->actingAs($this->user)
        ->getJson(route('specimens.form-data'))
        ->assertOk()
        ->json();

    expect($data['activeLocationId'])->toBe($this->location->id);
});

test('returns null activeLocationId when no active CaiRange exists', function () {
    $data = $this->actingAs($this->user)
        ->getJson(route('specimens.form-data'))
        ->assertOk()
        ->json();

    expect($data['activeLocationId'])->toBeNull();
});
