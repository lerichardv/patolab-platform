<?php

use App\Models\Customer;
use App\Models\Permission;
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
use Illuminate\Validation\ValidationException;

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

test('specimens.advance-status endpoint advances specimen to next logical state', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Citología Advance Test', 'active' => true, 'requires_report' => false]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'processing', 'step_order' => 2, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 3, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal 4', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test 4', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test 4', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test 4', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-ADV-01-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    expect($specimen->next_status)->toBe('processing');
    expect($specimen->next_status_label)->toBe('En Procesamiento');

    $response = $this->actingAs($user)->postJson(route('specimens.advance-status', $specimen));

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'next_status' => 'processing',
        ]);

    $specimen->refresh();
    expect($specimen->status)->toBe('processing');
});

test('transition to finalized with requires_report false skips signature check', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Pap Smear No Report', 'active' => true, 'requires_report' => false]);
    $type->states()->create(['status' => 'processing', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 2, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal 5', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test 5', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test 5', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test 5', 'referrer_type' => $referrerType->id, 'active' => true]);

    // Pathologist without signature
    $pathologist = User::factory()->create(['user_signature' => null]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-NOREP-01-2026',
        'status' => 'processing',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $specimen->users()->attach($pathologist->id, ['macroscopy_access' => true, 'microscopy_access' => true]);

    $service = app(SpecimenStatusService::class);
    $transitioned = $service->transition($specimen, 'finalized', ['user' => $user]);

    expect($transitioned->status)->toBe('finalized');
});

test('report editor show redirects with error when specimen does not require report', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'No Report Specimen', 'active' => true, 'requires_report' => false]);

    $priority = Priority::create(['name' => 'Normal 6', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test 6', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test 6', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test 6', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-NOREP-02-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $response = $this->actingAs($user)->get(route('specimens.report-editor', $specimen));
    $response->assertRedirect();
    $response->assertSessionHas('error');
});

test('specimen type can be stored and updated with requires_report', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $this->actingAs($user)->post(route('specimen-types.store'), [
        'name' => 'Tipo Sin Reporte',
        'description' => 'Test Desc',
        'requires_report' => false,
    ]);

    $type = SpecimenType::where('name', 'Tipo Sin Reporte')->first();
    expect($type)->not->toBeNull();
    expect($type->requires_report)->toBeFalse();

    $this->actingAs($user)->put(route('specimen-types.update', $type), [
        'name' => 'Tipo Con Reporte',
        'requires_report' => true,
    ]);

    $type->refresh();
    expect($type->name)->toBe('Tipo Con Reporte');
    expect($type->requires_report)->toBeTrue();
});

test('cannot transition to finalized when specimen requires report but report does not exist', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin Finalize', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Report Required Specimen', 'active' => true, 'requires_report' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 2, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal Fin', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Test Fin', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Test Fin', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Ref Test Fin', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-NO-REP-FIN-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'report_id' => null,
    ]);

    $service = app(SpecimenStatusService::class);

    expect(fn () => $service->transition($specimen, 'finalized', ['user' => $user]))
        ->toThrow(ValidationException::class);
});

test('bulkAction skips specimens whose specimen type does not have the target status active', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin Bulk Action', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    Gate::define('specimens.edit', fn () => true);

    $typeA = SpecimenType::create(['name' => 'Biopsia Con Macro', 'active' => true]);
    $typeA->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $typeA->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => true]);
    $typeA->states()->create(['status' => 'finalized', 'step_order' => 3, 'active' => true]);

    $typeB = SpecimenType::create(['name' => 'Citologia Sin Macro', 'active' => true]);
    $typeB->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $typeB->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => false]); // disabled!
    $typeB->states()->create(['status' => 'processing', 'step_order' => 3, 'active' => true]);
    $typeB->states()->create(['status' => 'finalized', 'step_order' => 4, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal Bulk', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Bulk', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Bulk', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Bulk', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimenA = Specimen::create([
        'sequence_code' => 'TEST-BULK-A-2026',
        'status' => 'received',
        'specimen_type' => $typeA->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $specimenB = Specimen::create([
        'sequence_code' => 'TEST-BULK-B-2026',
        'status' => 'received',
        'specimen_type' => $typeB->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $this->actingAs($user)->post(route('specimens.bulk-action'), [
        'ids' => [$specimenA->id, $specimenB->id],
        'action' => 'change_status',
        'value' => 'macroscopic_review',
    ]);

    $specimenA->refresh();
    $specimenB->refresh();

    // Specimen A allows macroscopic_review and should transition
    expect($specimenA->status)->toBe('macroscopic_review');
    // Specimen B has macroscopic_review disabled and should NOT be corrupted to it
    expect($specimenB->status)->toBe('received');
});

test('creating report from report editor advances specimen from received to next active status according to specimen type', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'Admin Report Creator', 'slug' => 'admin']);
    $user->update(['role_id' => $role->id]);

    Gate::define('specimens.edit', fn () => true);

    // Type with received -> processing (macroscopic_review skipped/disabled)
    $type = SpecimenType::create(['name' => 'Citología Líquida', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => false]);
    $type->states()->create(['status' => 'processing', 'step_order' => 3, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 4, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal Rep', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Rep', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Rep', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Rep', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-REP-CREATE-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $response = $this->actingAs($user)->post(route('specimens.report-editor.store', $specimen->sequence_code), [
        'template_id' => null,
    ]);

    $response->assertRedirect();
    $specimen->refresh();

    expect($specimen->report_id)->not->toBeNull();
    // Must advance to processing, which is the next active status for this specimen type!
    expect($specimen->status)->toBe('processing');
});

test('modifying finalized or delivered specimen requires specimens.manage_status permission', function () {
    $perm = Permission::firstOrCreate(
        ['slug' => 'specimens.manage_status'],
        ['name' => 'Gestionar Estado de Muestras']
    );

    $roleWithout = Role::create(['name' => 'Staff Regular', 'slug' => 'staff_regular']);
    $userWithout = User::factory()->create(['role_id' => $roleWithout->id]);

    $roleWith = Role::create(['name' => 'Supervisor Status', 'slug' => 'supervisor_status']);
    $roleWith->permissions()->attach($perm->id);
    $userWith = User::factory()->create(['role_id' => $roleWith->id]);

    $type = SpecimenType::create(['name' => 'Biopsia Perms', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'processing', 'step_order' => 2, 'active' => true]);
    $type->states()->create(['status' => 'finalized', 'step_order' => 3, 'active' => true]);

    $priority = Priority::create(['name' => 'Normal Fin Perm', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Fin Perm', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Fin Perm', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Fin Perm', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-FIN-PERM-2026',
        'status' => 'finalized',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $service = app(SpecimenStatusService::class);

    // User without manage_status cannot transition a finalized specimen
    expect(fn () => $service->transition($specimen, 'processing', ['user' => $userWithout]))
        ->toThrow(ValidationException::class);

    // User with manage_status can transition a finalized specimen
    $updated = $service->transition($specimen, 'processing', ['user' => $userWith]);
    expect($updated->status)->toBe('processing');
});

test('user without manage_status permission has status change ignored on quickUpdate', function () {
    $role = Role::create(['name' => 'Editor Normal', 'slug' => 'editor_normal']);
    // Grant specimens.edit so user can access quickUpdate
    $permEdit = Permission::firstOrCreate(['slug' => 'specimens.edit'], ['name' => 'Editar Muestras']);
    $role->permissions()->attach($permEdit->id);

    $user = User::factory()->create(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Biopsia Quick Ignored', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'processing', 'step_order' => 2, 'active' => true]);

    $priority1 = Priority::create(['name' => 'Prio 1', 'order' => 1, 'color' => '#000000']);
    $priority2 = Priority::create(['name' => 'Prio 2', 'order' => 2, 'color' => '#ffffff']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Quick Ignored', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Quick Ignored', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Quick Ignored', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-QUICK-IGN-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority1->id,
    ]);

    // Send quickUpdate with priority2 and changed status 'processing'
    $this->actingAs($user)->post(route('specimens.quick-update', $specimen->id), [
        'referrer' => $referrer->id,
        'specimen_category' => $category->id,
        'priority_id' => $priority2->id,
        'status' => 'processing', // Should be IGNORED because user lacks specimens.manage_status
    ]);

    $specimen->refresh();

    // Priority was updated
    expect($specimen->priority_id)->toBe($priority2->id);
    // But status change was IGNORED
    expect($specimen->status)->toBe('received');
});

test('user with manage_status permission can update status on quickUpdate', function () {
    $role = Role::create(['name' => 'Editor Supervisor', 'slug' => 'editor_sup']);
    $permEdit = Permission::firstOrCreate(['slug' => 'specimens.edit'], ['name' => 'Editar Muestras']);
    $permManageStatus = Permission::firstOrCreate(['slug' => 'specimens.manage_status'], ['name' => 'Gestionar Estado']);
    $role->permissions()->attach([$permEdit->id, $permManageStatus->id]);

    $user = User::factory()->create(['role_id' => $role->id]);

    $type = SpecimenType::create(['name' => 'Biopsia Quick Allowed', 'active' => true]);
    $type->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $type->states()->create(['status' => 'processing', 'step_order' => 2, 'active' => true]);

    $priority = Priority::create(['name' => 'Prio Ok', 'order' => 1, 'color' => '#000000']);
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create(['name' => 'Cat Quick Allowed', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Médico Quick Allowed', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Dr. Quick Allowed', 'referrer_type' => $referrerType->id, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-QUICK-OK-2026',
        'status' => 'received',
        'specimen_type' => $type->id,
        'customer' => $customer->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
    ]);

    $this->actingAs($user)->post(route('specimens.quick-update', $specimen->id), [
        'referrer' => $referrer->id,
        'specimen_category' => $category->id,
        'priority_id' => $priority->id,
        'status' => 'processing',
    ]);

    $specimen->refresh();

    // Status was successfully updated!
    expect($specimen->status)->toBe('processing');
});
