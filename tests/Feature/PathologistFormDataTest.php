<?php

use App\Models\Customer;
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
    $this->pathologistRole = Role::create(['slug' => 'pathologist', 'name' => 'Pathologist']);
    $this->assistantRole = Role::create(['slug' => 'assistant_pathologist', 'name' => 'Assistant Pathologist']);

    Setting::create([
        'setting_key' => 'pathologist_role_id',
        'setting_value' => (string) $this->pathologistRole->id,
        'description' => 'Pathologist Role ID',
    ]);

    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $managePermission = Permission::create(['slug' => 'specimens.manage', 'name' => 'Asignar Patólogos']);
    $viewPermission = Permission::create(['slug' => 'specimens.view', 'name' => 'Ver Muestras']);
    $assignmentsPermission = Permission::create(['slug' => 'my_assignments.view', 'name' => 'Mis Asignaciones']);

    $this->adminRole->permissions()->attach([$managePermission->id, $viewPermission->id]);

    $this->pathologistUser = User::factory()->create([
        'name' => 'Dr. House',
        'role_id' => $this->pathologistRole->id,
        'active' => true,
    ]);

    $this->assistantUser = User::factory()->create([
        'name' => 'Dr. Watson',
        'role_id' => $this->assistantRole->id,
        'active' => true,
    ]);

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

test('unauthenticated users cannot access pathologist form data', function () {
    $this->getJson(route('specimens.pathologists.form-data'))
        ->assertUnauthorized();
});

test('users without proper permissions cannot access pathologist form data', function () {
    $limitedRole = Role::create(['slug' => 'limited', 'name' => 'Limited']);
    $limitedUser = User::factory()->create([
        'role_id' => $limitedRole->id,
        'active' => true,
    ]);

    $this->actingAs($limitedUser)
        ->getJson(route('specimens.pathologists.form-data'))
        ->assertForbidden();
});

test('users with specimens.manage can access pathologist form data', function () {
    $this->actingAs($this->user)
        ->getJson(route('specimens.pathologists.form-data'))
        ->assertOk()
        ->assertJsonStructure([
            'pathologists',
            'usersList',
            'specimen',
        ])
        ->assertJsonCount(2, 'pathologists');
});

test('users with my_assignments.view can access pathologist form data', function () {
    $role = Role::create(['slug' => 'assigned_only', 'name' => 'Assigned Only']);
    $perm = Permission::where('slug', 'my_assignments.view')->first();
    $role->permissions()->attach($perm);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $this->actingAs($user)
        ->getJson(route('specimens.pathologists.form-data'))
        ->assertOk();
});

test('specimen details and relationships are returned when specimen_id is provided', function () {
    $this->specimen->users()->attach($this->pathologistUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $this->specimen->collaborators()->attach($this->assistantUser->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('specimens.pathologists.form-data', ['specimen_id' => $this->specimen->id]))
        ->assertOk();

    $data = $response->json();

    expect($data['specimen'])->not->toBeNull();
    expect($data['specimen']['id'])->toBe($this->specimen->id);
    expect($data['specimen']['sequence_code'])->toBe('BIO-0001-09-2026');
    expect($data['specimen']['users'])->toHaveCount(1);
    expect($data['specimen']['users'][0]['id'])->toBe($this->pathologistUser->id);
    expect($data['specimen']['collaborators'])->toHaveCount(1);
    expect($data['specimen']['collaborators'][0]['id'])->toBe($this->assistantUser->id);
});
