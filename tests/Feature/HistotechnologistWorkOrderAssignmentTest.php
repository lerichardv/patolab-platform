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

test('cannot change status to En Proceso without assigned technicians', function () {
    $workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 3,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('histotechnologist-work-orders.update-status', $workOrder->id), [
            'status' => 'En Proceso',
        ]);

    $response->assertSessionHasErrors(['status']);
    $this->assertEquals('Enviada', $workOrder->fresh()->status);
});

test('can change status to En Proceso when technician is assigned', function () {
    $workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 3,
        'quantity' => 1,
    ]);

    $workOrder->users()->attach($this->technician->id);

    $response = $this->actingAs($this->user)
        ->put(route('histotechnologist-work-orders.update-status', $workOrder->id), [
            'status' => 'En Proceso',
        ]);

    $response->assertRedirect();
    $this->assertEquals('En Proceso', $workOrder->fresh()->status);
});

test('work orders index defaults to created_at desc ordering', function () {
    $wo1 = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 3,
        'quantity' => 1,
    ]);
    $wo1->created_at = now()->subDays(2);
    $wo1->save();

    $wo2 = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 1,
        'quantity' => 1,
    ]);
    $wo2->created_at = now();
    $wo2->save();

    $response = $this->actingAs($this->user)
        ->get(route('histotechnologist-work-orders.index'));

    $response->assertOk();
    $workOrders = $response->viewData('page')['props']['workOrders'];

    expect($workOrders[0]['id'])->toBe($wo2->id)
        ->and($workOrders[1]['id'])->toBe($wo1->id);
});

test('work orders index can sort by created_at asc', function () {
    $wo1 = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 3,
        'quantity' => 1,
    ]);
    $wo1->created_at = now()->subDays(2);
    $wo1->save();

    $wo2 = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 1,
        'quantity' => 1,
    ]);
    $wo2->created_at = now();
    $wo2->save();

    $response = $this->actingAs($this->user)
        ->get(route('histotechnologist-work-orders.index', [
            'sort_field' => 'created_at',
            'sort_direction' => 'asc',
        ]));

    $response->assertOk();
    $workOrders = $response->viewData('page')['props']['workOrders'];

    expect($workOrders[0]['id'])->toBe($wo1->id)
        ->and($workOrders[1]['id'])->toBe($wo2->id);
});

test('work orders index can sort by due_date asc and desc', function () {
    $wo1 = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 3,
        'quantity' => 1,
        'due_date' => now()->addDays(5),
    ]);

    $wo2 = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'status' => 'Enviada',
        'priority' => 1,
        'quantity' => 1,
        'due_date' => now()->addDays(1),
    ]);

    // Test ASC (soonest first: wo2, then wo1)
    $responseAsc = $this->actingAs($this->user)
        ->get(route('histotechnologist-work-orders.index', [
            'sort_field' => 'due_date',
            'sort_direction' => 'asc',
        ]));

    $responseAsc->assertOk();
    $workOrdersAsc = $responseAsc->viewData('page')['props']['workOrders'];
    expect($workOrdersAsc[0]['id'])->toBe($wo2->id)
        ->and($workOrdersAsc[1]['id'])->toBe($wo1->id);

    // Test DESC (latest first: wo1, then wo2)
    $responseDesc = $this->actingAs($this->user)
        ->get(route('histotechnologist-work-orders.index', [
            'sort_field' => 'due_date',
            'sort_direction' => 'desc',
        ]));

    $responseDesc->assertOk();
    $workOrdersDesc = $responseDesc->viewData('page')['props']['workOrders'];
    expect($workOrdersDesc[0]['id'])->toBe($wo1->id)
        ->and($workOrdersDesc[1]['id'])->toBe($wo2->id);
});
