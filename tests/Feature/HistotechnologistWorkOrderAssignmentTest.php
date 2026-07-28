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
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $this->technician = User::factory()->create([
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $specimenType = SpecimenType::create(['name' => 'Biopsia Tipo']);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $specimenType->id,
        'name' => 'Examen',
        'code' => 'EX',
        'description' => 'Descripción del examen',
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente']);
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

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $customer->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);
});

test('can assign and unassign technician when work order status is not Finalizada', function () {
    $workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 3,
        'quantity' => 1,
    ]);

    // Assign
    $response = $this->actingAs($this->user)
        ->post(route('histotechnologist-work-orders.assign', $workOrder->id), [
            'user_id' => $this->technician->id,
        ]);

    $response->assertRedirect();
    $this->assertTrue($workOrder->users()->where('user_id', $this->technician->id)->exists());

    // Unassign
    $response = $this->actingAs($this->user)
        ->delete(route('histotechnologist-work-orders.unassign', [
            'work_order' => $workOrder->id,
            'user' => $this->technician->id,
        ]));

    $response->assertRedirect();
    $this->assertFalse($workOrder->users()->where('user_id', $this->technician->id)->exists());
});

test('cannot assign or unassign technician when work order status is Finalizada', function () {
    $workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Finalizada',
        'priority' => 3,
        'quantity' => 1,
    ]);

    // Attempt Assign
    $response = $this->actingAs($this->user)
        ->post(route('histotechnologist-work-orders.assign', $workOrder->id), [
            'user_id' => $this->technician->id,
        ]);

    $response->assertSessionHasErrors(['status']);
    $this->assertFalse($workOrder->users()->where('user_id', $this->technician->id)->exists());

    // Force attach to test unassign
    $workOrder->users()->attach($this->technician->id);

    // Attempt Unassign
    $response = $this->actingAs($this->user)
        ->delete(route('histotechnologist-work-orders.unassign', [
            'work_order' => $workOrder->id,
            'user' => $this->technician->id,
        ]));

    $response->assertSessionHasErrors(['status']);
    $this->assertTrue($workOrder->users()->where('user_id', $this->technician->id)->exists());
});
