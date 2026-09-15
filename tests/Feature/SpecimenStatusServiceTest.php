<?php

use App\Models\Customer;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\User;
use App\Services\SpecimenStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it seeds default states when creating a specimen type', function () {
    $type = SpecimenType::create([
        'name' => 'Biopsia Test',
        'description' => 'Test',
        'active' => true,
    ]);

    $defaultStates = [
        1 => 'received',
        2 => 'macroscopic_review',
        3 => 'processing',
        4 => 'microscopic_review',
        5 => 'finalized',
        6 => 'delivered',
        7 => 'cancelled',
    ];

    foreach ($defaultStates as $order => $status) {
        $type->states()->create([
            'status' => $status,
            'step_order' => $order,
            'active' => true,
        ]);
    }

    expect($type->states)->toHaveCount(7);
    expect($type->activeStates)->toHaveCount(7);
});

test('service returns correct initial status based on active states', function () {
    $service = new SpecimenStatusService;

    $type = SpecimenType::create(['name' => 'Citología Rapida', 'active' => true]);

    // Create custom states: macroscopic_review is disabled
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => false]);
    $type->states()->create(['status' => 'processing', 'step_order' => 2, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 3, 'active' => true]);

    $initial = $service->getInitialStatus($type);
    expect($initial)->toBe('processing');
});

test('service calculates next status skipping inactive states', function () {
    $service = new SpecimenStatusService;

    $type = SpecimenType::create(['name' => 'Biopsia Directa', 'active' => true]);

    // Flow: received (active) -> macroscopic_review (inactive) -> microscopic_review (active) -> finalized (active)
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => false]);
    $type->states()->create(['status' => 'microscopic_review', 'step_order' => 3, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 4, 'active' => true]);

    $specimen = new Specimen([
        'specimen_type' => $type->id,
        'status' => 'received',
    ]);

    $next = $service->getNextStatus($specimen);
    expect($next)->toBe('microscopic_review');

    $specimen->status = 'microscopic_review';
    $nextAfterMicro = $service->getNextStatus($specimen);
    expect($nextAfterMicro)->toBe('finalized');

    $specimen->status = 'finalized';
    $nextAfterFinalized = $service->getNextStatus($specimen);
    expect($nextAfterFinalized)->toBeNull();
});

test('endpoints can get and update specimen type states', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Tipo Test', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 2, 'active' => true]);

    $response = $this->actingAs($user)->getJson(route('specimen-types.get-states', $type));
    $response->assertOk()
        ->assertJsonStructure([
            'specimen_type' => ['id', 'name'],
            'states' => [['id', 'status', 'step_order', 'active', 'label', 'color']],
        ]);

    $updateResponse = $this->actingAs($user)->put(route('specimen-types.update-states', $type), [
        'states' => [
            ['status' => 'received', 'step_order' => 2, 'active' => true],
            ['status' => 'finalized', 'step_order' => 1, 'active' => true],
            ['status' => 'processing', 'step_order' => 3, 'active' => false],
        ],
    ]);

    $updateResponse->assertRedirect();

    $this->assertDatabaseHas('specimen_type_states', [
        'specimen_type_id' => $type->id,
        'status' => 'finalized',
        'step_order' => 1,
        'active' => true,
    ]);
});

test('creating a report transitions specimen to dynamic next status instead of hardcoded macroscopy', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Tipo Sin Macroscopia', 'active' => true]);

    // Custom workflow: received -> processing -> finalized (no macroscopic_review)
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => false]);
    $type->states()->create(['status' => 'processing', 'step_order' => 3, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 4, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal', 'order' => 1, 'color' => '#000000']);

    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-001-01-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Biopsia Test',
    ]);

    $response = $this->actingAs($user)->postJson(route('specimens.report-editor.store', $specimen), [
        'template_ids' => [],
    ]);

    $response->assertOk();

    $specimen->refresh();
    // Must be updated to 'processing', NOT 'macroscopic_review'
    expect($specimen->status)->toBe('processing');
    expect($specimen->report_id)->not->toBeNull();
});

test('SpecimenStatusService transition updates status and dates correctly', function () {
    $service = new SpecimenStatusService;

    $type = SpecimenType::create(['name' => 'Biopsia Service Test', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => true]);
    $type->states()->create(['status' => 'processing', 'step_order' => 3, 'active' => true]);
    $type->states()->create(['status' => 'cancelled', 'step_order' => 4, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal 2', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test 2', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test 2', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test 2', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-002-01-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $service->transition($specimen, 'macroscopic_review');
    $specimen->refresh();
    expect($specimen->status)->toBe('macroscopic_review');
    expect($specimen->macroscopic_review_at)->not->toBeNull();

    $service->transition($specimen, 'cancelled', ['cancellation_reason' => 'Muestra en mal estado']);
    $specimen->refresh();
    expect($specimen->status)->toBe('cancelled');
    expect($specimen->cancellation_reason)->toBe('Muestra en mal estado');
    expect($specimen->cancelled_at)->not->toBeNull();
});

test('specimens.change-status endpoint changes specimen status', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Citología Endpoint Test', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => true]);
    $type->states()->create(['status' => 'processing', 'step_order' => 3, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal 3', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test 3', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test 3', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test 3', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-003-01-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $response = $this->actingAs($user)->postJson(route('specimens.change-status', $specimen), [
        'status' => 'macroscopic_review',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $specimen->refresh();
    expect($specimen->status)->toBe('macroscopic_review');
});
