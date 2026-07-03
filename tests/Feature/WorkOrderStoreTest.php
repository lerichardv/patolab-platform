<?php

use App\Models\Customer;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderTask;
use App\Models\WorkOrderType;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('pathologist can create a work order', function () {
    // 1. Setup role and permissions
    $pathologistRole = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $user = User::factory()->create([
        'role_id' => $pathologistRole->id,
        'active' => true,
    ]);

    $technician = User::factory()->create([
        'active' => true,
    ]);

    $customer = Customer::factory()->create();

    $specimenType = SpecimenType::create([
        'name' => 'Biopsia Tipo',
    ]);

    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $specimenType->id,
        'name' => 'Examen',
        'code' => 'EX',
        'description' => 'Descripción del examen',
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
    ]);

    $referrerType = ReferrerType::create([
        'name' => 'Tipo de Referente',
    ]);

    $referrer = Referrer::create([
        'name' => 'Referente',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Baja',
        'color' => '#10b981',
        'order' => 3,
        'active' => true,
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $customer->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
    ]);

    $workOrderType = WorkOrderType::create([
        'name' => 'Biopsia',
        'duration_value' => 24,
        'duration_unit' => 'hours',
    ]);

    $task = WorkOrderTask::create([
        'name' => 'Corte',
        'description' => 'Corte histológico',
    ]);

    // Act
    $response = $this->actingAs($user)
        ->post(route('work-order-records.store'), [
            'specimen_id' => $specimen->id,
            'specimen_ids' => [],
            'work_order_type_id' => $workOrderType->id,
            'work_order_task_id' => $task->id,
            'user_ids' => [$technician->id],
            'status' => 'Enviada',
            'priority' => 3,
            'comments' => 'Test comment',
        ]);

    // Assert
    $response->assertRedirect();

    // Check if work order was created in DB
    $workOrders = WorkOrder::all();
    expect($workOrders)->toHaveCount(1);
});
