<?php

use App\Models\Customer;
use App\Models\Cutting;
use App\Models\CuttingCode;
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
    $this->role = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $viewPermission = Permission::create(['slug' => 'my_assignments.view', 'name' => 'Ver Mis Asignaciones']);
    $this->role->permissions()->attach($viewPermission);

    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create();
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Análisis General',
        'code' => 'AG',
        'description' => 'Descripción',
    ]);
    $this->category = SpecimenCategory::create(['name' => 'Cat A', 'quantity' => 1]);

    $this->referrerType = ReferrerType::create(['name' => 'Clínica']);
    $this->referrer = Referrer::create([
        'name' => 'Hospital Central',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#10b981',
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
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'status' => 'processing',
        'active' => true,
    ]);

    // Assign specimen to user
    $this->specimen->users()->attach($this->user->id);

    $this->codeA = CuttingCode::create(['code' => 'A', 'color' => '#ffffff']);
    $this->codeB = CuttingCode::create(['code' => 'B', 'color' => '#ffffff']);
    $this->workOrderType = WorkOrderType::create([
        'name' => 'Rutina',
        'duration_unit' => 'days',
        'duration_value' => 1,
    ]);

    $this->cutting1 = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->codeA->id,
        'description' => 'Corte A',
        'number_of_cuttings' => 1,
        'cuttings_description' => 'CR',
        'number_of_slides' => 1,
        'cutting_slide_types' => [$this->workOrderType->id],
        'status' => 'delivered',
        'responsible_id' => $this->user->id,
    ]);

    $this->cutting2 = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->codeB->id,
        'description' => 'Corte B',
        'number_of_cuttings' => 1,
        'cuttings_description' => 'CR',
        'number_of_slides' => 1,
        'cutting_slide_types' => [$this->workOrderType->id],
        'status' => 'macroscopy',
        'responsible_id' => $this->user->id,
    ]);
});

test('authenticated user can view my assignments page with specimen cuttings and their statuses', function () {
    $response = $this->actingAs($this->user)->get('/my-assignments');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('my-assignments/index')
        ->has('specimens', 1)
        ->has('specimens.0.cuttings', 2)
        ->where('specimens.0.cuttings.0.status', 'delivered')
        ->where('specimens.0.cuttings.1.status', 'macroscopy')
    );
});
