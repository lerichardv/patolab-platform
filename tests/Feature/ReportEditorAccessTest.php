<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
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
        'status' => 'received',
        'access_token' => 'test-access-token',
        'delivery_token' => 'test-delivery-token',
    ]);

    $this->assignedUser = User::factory()->create();
    $this->collaboratorUser = User::factory()->create();
    $this->unassignedUser = User::factory()->create();

    // Assign the pathologist (user)
    $this->specimen->users()->attach($this->assignedUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    // Assign the collaborator
    $this->specimen->collaborators()->attach($this->collaboratorUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => false,
    ]);
});

test('assigned user can access the report editor page', function () {
    $this->actingAs($this->assignedUser);

    $response = $this->get(route('specimens.report-editor', $this->specimen->sequence_code));

    $response->assertStatus(200);
});

test('collaborator user can access the report editor page', function () {
    $this->actingAs($this->collaboratorUser);

    $response = $this->get(route('specimens.report-editor', $this->specimen->sequence_code));

    $response->assertStatus(200);
});

test('unassigned user can access the report editor page in read-only mode', function () {
    $this->actingAs($this->unassignedUser);

    $response = $this->get(route('specimens.report-editor', $this->specimen->sequence_code));

    $response->assertStatus(200);
});

test('unassigned user is forbidden from creating/storing a report', function () {
    $this->actingAs($this->unassignedUser);

    $response = $this->post(route('specimens.report-editor.store', $this->specimen->sequence_code), [
        'template_id' => null,
    ]);

    $response->assertStatus(403);
});
