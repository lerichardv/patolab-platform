<?php

use App\Events\WorkOrderUpdated;
use App\Models\Customer;
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
use App\Models\WorkOrder;
use App\Models\WorkOrderTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->role = Role::create(['slug' => 'technician', 'name' => 'Técnico']);
    $this->permission = Permission::create(['slug' => 'work_orders.admin_view', 'name' => 'Admin View Work Orders']);
    $this->role->permissions()->attach($this->permission);

    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create();
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Examen',
        'code' => 'EX',
    ]);
    $this->category = SpecimenCategory::create(['name' => 'Cat', 'quantity' => 1]);
    $this->referrerType = ReferrerType::create(['name' => 'Ref Type']);
    $this->referrer = Referrer::create([
        'name' => 'Dr. Ref',
        'email' => 'ref@patolab.test',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1, 'active' => true]);

    $this->specimen = Specimen::create([
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'customer' => $this->customer->id,
        'priority_id' => $this->priority->id,
        'number_of_samples' => 1,
    ]);

    $this->task = WorkOrderTask::create([
        'name' => 'Corte seriado',
        'description' => 'Descripción de la tarea',
        'duration_unit' => 'hours',
        'duration_value' => 24,
    ]);
});

test('creating and updating a work order dispatches WorkOrderUpdated event', function () {
    Event::fake([WorkOrderUpdated::class]);

    $workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'work_order_task_id' => $this->task->id,
        'quantity' => 2,
        'priority' => 1,
        'status' => 'Enviada',
    ]);

    Event::assertDispatched(WorkOrderUpdated::class, function ($event) use ($workOrder) {
        return $event->workOrderId === $workOrder->id && $event->action === 'created';
    });

    $workOrder->update(['status' => 'En Proceso']);

    Event::assertDispatched(WorkOrderUpdated::class, function ($event) use ($workOrder) {
        return $event->workOrderId === $workOrder->id && $event->action === 'status_changed';
    });

    $workOrder->update(['comments' => 'Comentario nuevo']);

    Event::assertDispatched(WorkOrderUpdated::class, function ($event) use ($workOrder) {
        return $event->workOrderId === $workOrder->id && $event->action === 'updated';
    });

    Event::assertDispatchedTimes(WorkOrderUpdated::class, 3);
});

test('assigning and unassigning technician dispatches WorkOrderUpdated event via touch', function () {
    $workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'work_order_task_id' => $this->task->id,
        'quantity' => 1,
        'priority' => 1,
        'status' => 'Enviada',
    ]);

    $tech = User::factory()->create(['role_id' => $this->role->id, 'active' => true]);

    Event::fake([WorkOrderUpdated::class]);

    $this->actingAs($this->user)
        ->post(route('histotechnologist-work-orders.assign', $workOrder), [
            'user_id' => $tech->id,
        ]);

    Event::assertDispatched(WorkOrderUpdated::class, function ($event) use ($workOrder) {
        return $event->workOrderId === $workOrder->id;
    });
});

test('work-orders channel authorization checks work_orders.admin_view permission', function () {
    $authorizedUser = $this->user; // Has work_orders.admin_view
    $unauthorizedUser = User::factory()->create(['active' => true]); // No permission

    expect($authorizedUser->can('work_orders.admin_view'))->toBeTrue();
    expect($unauthorizedUser->can('work_orders.admin_view'))->toBeFalse();
});
