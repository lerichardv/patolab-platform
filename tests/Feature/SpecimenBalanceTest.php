<?php

use App\Models\AuditLog;
use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Location;
use App\Models\PathologistExaminationDuration;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Permissions
    $this->permView = Permission::firstOrCreate(
        ['slug' => 'specimens_balance.view'],
        ['name' => 'Ver Balance de Muestras']
    );
    $this->permManage = Permission::firstOrCreate(
        ['slug' => 'specimens_balance.manage'],
        ['name' => 'Gestionar Balance de Muestras']
    );

    // Roles
    $this->adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'Administrador']);
    $this->pathologistRole = Role::firstOrCreate(['slug' => 'pathologist'], ['name' => 'Patólogo']);
    $this->pathologistRole->permissions()->syncWithoutDetaching([$this->permView->id, $this->permManage->id]);

    $this->viewerRole = Role::firstOrCreate(['slug' => 'viewer'], ['name' => 'Visualizador']);
    $this->viewerRole->permissions()->syncWithoutDetaching([$this->permView->id]);

    $this->unauthorizedRole = Role::firstOrCreate(['slug' => 'clerk'], ['name' => 'Recepcionista']);

    // Users
    $this->adminUser = User::factory()->create([
        'name' => 'Admin User',
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $this->pathologistUser1 = User::factory()->create([
        'name' => 'Dr. Carlos Mendoza',
        'email' => 'carlos@patolab.test',
        'role_id' => $this->pathologistRole->id,
        'active' => true,
    ]);

    $this->pathologistUser2 = User::factory()->create([
        'name' => 'Dra. Ana López',
        'email' => 'ana@patolab.test',
        'role_id' => $this->pathologistRole->id,
        'active' => true,
    ]);

    $this->viewerUser = User::factory()->create([
        'name' => 'Viewer Only',
        'role_id' => $this->viewerRole->id,
        'active' => true,
    ]);

    $this->unauthorizedUser = User::factory()->create([
        'name' => 'No Perms User',
        'role_id' => $this->unauthorizedRole->id,
        'active' => true,
    ]);

    // Master domain entities
    $this->location = Location::create([
        'name' => 'Principal',
        'code' => 'PRI',
        'active' => true,
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'CAI-TEST-123',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2026-12-31',
        'active_number' => '000-001-01-00000000',
        'status' => 'active',
    ]);

    $this->customer = Customer::factory()->create(['name' => 'Juan Pérez']);
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO', 'active' => true]);

    $this->examination1 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Gástrica',
        'code' => 'BIO-GAS',
        'color' => '#10b981',
        'active' => true,
    ]);

    $this->examination2 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia de Piel',
        'code' => 'BIO-PIEL',
        'color' => '#f59e0b',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Estándar 5 días',
        'unit' => 'days',
        'quantity' => 5,
        'intern_unit' => 'days',
        'intern_quantity' => 3,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Médico', 'active' => true]);
    $this->referrer = Referrer::create([
        'name' => 'Dr. Smith',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#3b82f6',
        'order' => 1,
        'active' => true,
    ]);

    $this->sequence = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'B',
        'separator' => '-',
        'fill' => 4,
        'current_sequence' => 1,
        'month' => (int) date('m'),
        'year' => (int) date('y'),
        'active' => true,
    ]);
});

test('guest is redirected to login', function () {
    $this->get(route('specimens-balance.index'))
        ->assertRedirect(route('login'));
});

test('user without specimens_balance.view permission is forbidden', function () {
    $this->actingAs($this->unauthorizedUser)
        ->get(route('specimens-balance.index'))
        ->assertForbidden();
});

test('authorized user can view specimens balance page with inertia data', function () {
    $this->actingAs($this->viewerUser)
        ->get(route('specimens-balance.index'))
        ->assertSuccessful()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('specimens-balance/index')
            ->has('calendarDays')
            ->has('unassignedRow')
            ->has('pathologistRows')
            ->has('pathologists')
            ->has('durationsMap')
            ->has('summary')
            ->has('filterOptions')
            ->has('filters')
        );
});

test('balance board organizes unassigned and assigned specimens across calendar days', function () {
    Carbon::setTestNow('2026-10-12 09:00:00'); // Monday

    // Specimen 1: Unassigned
    $specimen1 = Specimen::create([
        'sequence_code' => 'B-0001-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Specimen 2: Assigned to Dr. Carlos Mendoza
    $specimen2 = Specimen::create([
        'sequence_code' => 'B-0002-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination2->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);
    $specimen2->users()->attach($this->pathologistUser1->id, [
        'assigned_by' => $this->adminUser->id,
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index'))
        ->assertSuccessful();

    $page = $response->viewData('page');
    $unassignedRow = $page['props']['unassignedRow'];
    $pathologistRows = $page['props']['pathologistRows'];

    expect($unassignedRow['total_specimens'])->toBe(1);

    // Find Dr. Carlos in pathologistRows
    $carlosRow = collect($pathologistRows)->firstWhere('user.id', $this->pathologistUser1->id);
    expect($carlosRow)->not->toBeNull()
        ->and($carlosRow['total_specimens'])->toBe(1);

    Carbon::setTestNow();
});

test('filters balance board by specimen type and examination ids', function () {
    Carbon::setTestNow('2026-10-12 09:00:00');

    $specimenType2 = SpecimenType::create(['name' => 'Citología', 'code' => 'CIT', 'active' => true]);
    $examOther = SpecimenTypeExamination::create([
        'specimen_type' => $specimenType2->id,
        'name' => 'Papanicolaou',
        'code' => 'PAP',
        'color' => '#6366f1',
        'active' => true,
    ]);

    // Specimen 1: Biopsia with examination1
    Specimen::create([
        'sequence_code' => 'B-0001-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Specimen 2: Citología with examOther
    Specimen::create([
        'sequence_code' => 'C-0001-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $specimenType2->id,
        'specimen_type_examination' => $examOther->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // 1. Filter by specimen_type_id array: only Biopsia
    $res1 = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index', ['specimen_type_id' => [$this->specimenType->id]]))
        ->assertSuccessful();
    $page1 = $res1->viewData('page');
    expect($page1['props']['unassignedRow']['total_specimens'])->toBe(1);

    // 2. Filter by examination_id array: only examOther
    $res2 = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index', ['examination_id' => [$examOther->id]]))
        ->assertSuccessful();
    $page2 = $res2->viewData('page');
    expect($page2['props']['unassignedRow']['total_specimens'])->toBe(1);

    // 3. Filter by 'none' examination_id
    $res3 = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index', ['examination_id' => 'none']))
        ->assertSuccessful();
    $page3 = $res3->viewData('page');
    expect($page3['props']['unassignedRow']['total_specimens'])->toBe(0);

    Carbon::setTestNow();
});

test('workload calculation calculates minutes and percentage based on 8-hour workday', function () {
    Carbon::setTestNow('2026-10-12 09:00:00'); // Monday

    // Set custom duration for Dr. Carlos: 120 minutes for examination1
    PathologistExaminationDuration::create([
        'user_id' => $this->pathologistUser1->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'duration_minutes' => 120,
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'B-0003-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);
    $specimen->users()->attach($this->pathologistUser1->id, [
        'assigned_by' => $this->adminUser->id,
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index'))
        ->assertSuccessful();

    $page = $response->viewData('page');
    $carlosRow = collect($page['props']['pathologistRows'])->firstWhere('user.id', $this->pathologistUser1->id);

    // 120 minutes / 60 = 2.0 hours
    expect($carlosRow['total_hours'])->toBe(2.0);

    $expectedDate = $specimen->expected_internal_finalization_date->format('Y-m-d');
    $dailyWorkload = $carlosRow['days'][$expectedDate]['workload'];

    expect($dailyWorkload['total_minutes'])->toBe(120)
        ->and($dailyWorkload['hours'])->toBe(2.0)
        ->and($dailyWorkload['percentage'])->toBe(25) // 120 / 480 * 100 = 25%
        ->and($dailyWorkload['color'])->toBe('green');

    Carbon::setTestNow();
});

test('filters specimens by examination and search query', function () {
    $specimen1 = Specimen::create([
        'sequence_code' => 'B-0010-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $otherCustomer = Customer::factory()->create(['name' => 'María García']);
    $specimen2 = Specimen::create([
        'sequence_code' => 'B-0020-10-26',
        'customer' => $otherCustomer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination2->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Filter by examination 1
    $response = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index', ['examination_id' => $this->examination1->id]))
        ->assertSuccessful();
    $page = $response->viewData('page');
    expect($page['props']['unassignedRow']['total_specimens'])->toBe(1);

    // Filter by search query matching customer name
    $responseSearch = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index', ['search' => 'María']))
        ->assertSuccessful();
    $pageSearch = $responseSearch->viewData('page');
    expect($pageSearch['props']['unassignedRow']['total_specimens'])->toBe(1);
});

test('reschedule horizontally reprograms internal date and shifts client delivery date', function () {
    Carbon::setTestNow('2026-10-12 09:00:00'); // Monday

    $specimen = Specimen::create([
        'sequence_code' => 'B-0030-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id, // 3 intern weekdays = Thursday Oct 15, 5 client weekdays = Monday Oct 19
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Move to Friday Oct 16 (+1 calendar day shift from Thursday Oct 15)
    $targetDate = '2026-10-16';

    $response = $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_date' => $targetDate,
            'reason' => 'Cambio de fecha por reprogramación de carga',
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'specimen_id' => $specimen->id,
        ]);

    $specimen->refresh();

    expect($specimen->is_manual_delivery_date_intern_enabled)->toBeTrue()
        ->and($specimen->is_manual_delivery_date_enabled)->toBeTrue()
        ->and($specimen->expected_internal_finalization_date->format('Y-m-d'))->toBe('2026-10-16');

    Carbon::setTestNow();
});

test('reschedule vertically reassigns pathologist and unassigns when target is unassigned', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'B-0040-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // 1. Assign to Dr. Carlos
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_user_id' => $this->pathologistUser1->id,
            'reason' => 'Asignación a Dr. Carlos',
        ])
        ->assertSuccessful();

    $specimen->refresh();
    expect($specimen->users->pluck('id')->toArray())->toContain($this->pathologistUser1->id);

    // 2. Reassign to Dra. Ana
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_user_id' => $this->pathologistUser2->id,
            'reason' => 'Reasignación a Dra. Ana',
        ])
        ->assertSuccessful();

    $specimen->refresh();
    expect($specimen->users->pluck('id')->toArray())->toEqual([$this->pathologistUser2->id]);

    // 3. Move to 'unassigned'
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_user_id' => 'unassigned',
            'reason' => 'Mover a sin asignar',
        ])
        ->assertSuccessful();

    $specimen->refresh();
    expect($specimen->users)->toBeEmpty();
});

test('user without specimens_balance.manage cannot reschedule or save durations', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'B-0050-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $this->actingAs($this->viewerUser)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_date' => '2026-10-20',
            'reason' => 'Intento sin permiso',
        ])
        ->assertForbidden();

    $this->actingAs($this->viewerUser)
        ->post(route('specimens-balance.durations'), [
            'user_id' => $this->pathologistUser1->id,
            'durations' => [
                [
                    'specimen_type_examination_id' => $this->examination1->id,
                    'duration_minutes' => 60,
                ],
            ],
        ])
        ->assertForbidden();
});

test('saveDurations updates pathologist duration and examination color', function () {
    $this->actingAs($this->pathologistUser1)
        ->post(route('specimens-balance.durations'), [
            'user_id' => $this->pathologistUser1->id,
            'durations' => [
                [
                    'specimen_type_examination_id' => $this->examination1->id,
                    'duration_minutes' => 75,
                    'color' => '#8b5cf6',
                ],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $duration = PathologistExaminationDuration::where('user_id', $this->pathologistUser1->id)
        ->where('specimen_type_examination_id', $this->examination1->id)
        ->first();

    expect($duration)->not->toBeNull()
        ->and($duration->duration_minutes)->toBe(75);

    $this->examination1->refresh();
    expect($this->examination1->color)->toBe('#8b5cf6');
});

test('index provides category_ids on examinations and saveDurations handles bulk updates', function () {
    // Associate specimen with category and examination1
    Specimen::create([
        'sequence_code' => 'B-0099-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'pending',
        'active' => true,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->pathologistUser1)
        ->get(route('specimens-balance.index'));

    $response->assertOk();
    $pageProps = $response->viewData('page')['props'];
    $examinations = collect($pageProps['filterOptions']['examinations']);
    $targetExam = $examinations->firstWhere('id', $this->examination1->id);

    expect($targetExam)->not->toBeNull();
    expect($targetExam['category_ids'])->toContain($this->category->id);

    // Bulk save durations for multiple examinations
    $this->actingAs($this->pathologistUser1)
        ->post(route('specimens-balance.durations'), [
            'user_id' => $this->pathologistUser1->id,
            'durations' => [
                [
                    'specimen_type_examination_id' => $this->examination1->id,
                    'duration_minutes' => 45,
                    'color' => '#10b981',
                ],
                [
                    'specimen_type_examination_id' => $this->examination2->id,
                    'duration_minutes' => 60,
                    'color' => '#3b82f6',
                ],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $duration1 = PathologistExaminationDuration::where('user_id', $this->pathologistUser1->id)
        ->where('specimen_type_examination_id', $this->examination1->id)
        ->first();
    $duration2 = PathologistExaminationDuration::where('user_id', $this->pathologistUser1->id)
        ->where('specimen_type_examination_id', $this->examination2->id)
        ->first();

    expect($duration1->duration_minutes)->toBe(45);
    expect($duration2->duration_minutes)->toBe(60);
});

test('unassignedList returns JSON list of unassigned specimens and filters by search', function () {
    // Unassigned specimen
    $specimen1 = Specimen::create([
        'sequence_code' => 'B-0080-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Assigned specimen (should not appear in unassignedList)
    $specimen2 = Specimen::create([
        'sequence_code' => 'B-0081-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination2->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);
    $specimen2->users()->attach($this->pathologistUser1->id);

    // 1. Fetch unassigned list
    $response = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.unassigned-list'))
        ->assertSuccessful()
        ->assertJsonStructure([
            'specimens' => [
                '*' => [
                    'id',
                    'sequence_code',
                    'customer_name',
                    'type_name',
                    'examination_name',
                    'points',
                    'internal_date',
                ],
            ],
            'total',
        ]);

    $data = $response->json();
    $codes = collect($data['specimens'])->pluck('sequence_code')->toArray();
    expect($codes)->toContain('B-0080-10-26')
        ->and($codes)->not->toContain('B-0081-10-26');

    // 2. Search filtering
    $searchRes = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.unassigned-list', ['search' => 'B-0080']))
        ->assertSuccessful()
        ->json();

    expect($searchRes['total'])->toBeGreaterThanOrEqual(1);
});

test('expiredList returns JSON list of overdue specimens', function () {
    Carbon::setTestNow('2026-10-01 09:00:00');

    // Expired specimen (created on 2026-10-01, category 3 internal days -> due ~2026-10-06)
    $expiredSpecimen = Specimen::create([
        'sequence_code' => 'B-0090-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    Carbon::setTestNow('2026-10-15 09:00:00');

    $response = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.expired-list'))
        ->assertSuccessful()
        ->assertJsonStructure([
            'specimens' => [
                '*' => [
                    'id',
                    'sequence_code',
                    'customer_name',
                    'examination_name',
                    'overdue_label',
                    'days_overdue',
                ],
            ],
            'total',
        ]);

    $codes = collect($response->json('specimens'))->pluck('sequence_code')->toArray();
    expect($codes)->toContain('B-0090-10-26');

    Carbon::setTestNow();
});

test('rescheduling multi-assigned specimen horizontally updates date while preserving all assigned pathologists', function () {
    Carbon::setTestNow('2026-10-12 09:00:00');

    $specimen = Specimen::create([
        'sequence_code' => 'B-0100-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Assign to both Carlos and Ana
    $specimen->users()->attach([
        $this->pathologistUser1->id => [
            'assigned_by' => $this->adminUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ],
        $this->pathologistUser2->id => [
            'assigned_by' => $this->adminUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ],
    ]);

    expect($specimen->users()->count())->toBe(2);

    // Reschedule horizontally to 2026-10-16
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_date' => '2026-10-16',
            'reason' => 'Reprogramación horizontal multiasignada',
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'specimen_id' => $specimen->id,
        ]);

    $specimen->refresh();

    // Date updated
    expect($specimen->expected_internal_finalization_date->format('Y-m-d'))->toBe('2026-10-16');

    // Both pathologists are still assigned
    $assignedUserIds = $specimen->users()->pluck('users.id')->toArray();
    expect($assignedUserIds)->toContain($this->pathologistUser1->id)
        ->and($assignedUserIds)->toContain($this->pathologistUser2->id)
        ->and(count($assignedUserIds))->toBe(2);

    Carbon::setTestNow();
});

test('moving multi-assigned specimen to another pathologist or unassigned is disabled/prevented', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'B-0110-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Assign to both Carlos and Ana
    $specimen->users()->attach([
        $this->pathologistUser1->id => [
            'assigned_by' => $this->adminUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ],
        $this->pathologistUser2->id => [
            'assigned_by' => $this->adminUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ],
    ]);

    expect($specimen->users()->count())->toBe(2);

    // Attempt to reassign to only Carlos via drag target_user_id
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_user_id' => $this->pathologistUser1->id,
            'reason' => 'Intento de reasignar',
        ])
        ->assertSuccessful();

    $specimen->refresh();

    // Reassignment is prevented: both pathologists remain assigned
    $assignedUserIds = $specimen->users()->pluck('users.id')->toArray();
    expect($assignedUserIds)->toContain($this->pathologistUser1->id)
        ->and($assignedUserIds)->toContain($this->pathologistUser2->id)
        ->and(count($assignedUserIds))->toBe(2);

    // Attempt to unassign via drag target_user_id
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_user_id' => 'unassigned',
            'reason' => 'Intento de desasignar',
        ])
        ->assertSuccessful();

    $specimen->refresh();

    // Still both pathologists remain assigned
    expect($specimen->users()->count())->toBe(2);
});

test('reschedule requires a reason parameter', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'B-0001-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_date' => '2026-10-15',
            'target_user_id' => $this->pathologistUser1->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reason']);
});

test('reschedule persists move_reason and moved_at and logs to audit_log with correct origin', function () {
    Carbon::setTestNow('2026-10-14 11:30:00');

    $specimen = Specimen::create([
        'sequence_code' => 'B-0002-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $reason = 'Reasignación por alta carga de trabajo en laboratorio';

    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.reschedule', $specimen), [
            'target_date' => '2026-10-16',
            'target_user_id' => $this->pathologistUser1->id,
            'reason' => $reason,
        ])
        ->assertSuccessful()
        ->assertJson(['success' => true]);

    $specimen->refresh();

    expect($specimen->move_reason)->toBe($reason)
        ->and($specimen->moved_at)->not->toBeNull()
        ->and($specimen->moved_at->toDateTimeString())->toBe('2026-10-14 11:30:00');

    $auditReason = AuditLog::where('table', $specimen->getTable())
        ->where('row_id', $specimen->id)
        ->where('column', 'move_reason')
        ->where('origin', 'specimens-balance-move')
        ->first();

    expect($auditReason)->not->toBeNull()
        ->and($auditReason->new_value)->toBe($reason);

    Carbon::setTestNow();
});

test('filters balance board by specimen category id', function () {
    Carbon::setTestNow('2026-10-12 09:00:00');

    $category2 = SpecimenCategory::create([
        'name' => 'Citología General',
        'unit' => 'days',
        'quantity' => 2,
        'intern_unit' => 'days',
        'intern_quantity' => 1,
        'active' => true,
    ]);

    $specimen1 = Specimen::create([
        'sequence_code' => 'B-0001-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'B-0002-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $category2->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $response = $this->actingAs($this->adminUser)
        ->get(route('specimens-balance.index', ['category_id' => $category2->id]))
        ->assertSuccessful()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('specimens-balance/index')
            ->where('filters.category_id', (string) $category2->id)
            ->where('unassignedRow.total_specimens', 1)
        );

    Carbon::setTestNow();
});

test('bulk reschedule requires permission specimens_balance.manage', function () {
    $this->actingAs($this->viewerUser)
        ->postJson(route('specimens-balance.bulk-reschedule'), [
            'ids' => [1],
            'action' => 'move_date',
            'target_date' => '2026-10-20',
            'reason' => 'Test reason',
        ])
        ->assertForbidden();
});

test('bulk reschedule requires valid ids, action, and reason', function () {
    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.bulk-reschedule'), [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ids', 'action', 'reason']);

    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.bulk-reschedule'), [
            'ids' => [999999],
            'action' => 'invalid_action',
            'reason' => 'Test reason',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ids.0', 'action']);
});

test('bulk reschedule shifts target date for multiple specimens and records audit log', function () {
    Carbon::setTestNow('2026-10-14 10:00:00');

    $specimen1 = Specimen::create([
        'sequence_code' => 'B-0010-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'B-0011-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $reason = 'Reprogramación masiva por mantenimiento en laboratorio';

    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.bulk-reschedule'), [
            'ids' => [$specimen1->id, $specimen2->id],
            'action' => 'move_date',
            'target_date' => '2026-10-19',
            'reason' => $reason,
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'count' => 2,
        ]);

    $specimen1->refresh();
    $specimen2->refresh();

    expect($specimen1->move_reason)->toBe($reason)
        ->and($specimen1->moved_at)->not->toBeNull()
        ->and($specimen2->move_reason)->toBe($reason)
        ->and($specimen2->moved_at)->not->toBeNull();

    // Verify AuditLog for each specimen with bulk move origin
    foreach ([$specimen1, $specimen2] as $specimen) {
        $auditLog = AuditLog::where('table', $specimen->getTable())
            ->where('row_id', $specimen->id)
            ->where('column', 'move_reason')
            ->where('origin', 'specimens-balance-bulk-move')
            ->first();

        expect($auditLog)->not->toBeNull()
            ->and($auditLog->new_value)->toBe($reason);
    }

    Carbon::setTestNow();
});

test('bulk reschedule reassigns multiple specimens to another pathologist', function () {
    $specimen1 = Specimen::create([
        'sequence_code' => 'B-0020-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);
    $specimen1->users()->attach($this->pathologistUser1->id, [
        'assigned_by' => $this->adminUser->id,
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'B-0021-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.bulk-reschedule'), [
            'ids' => [$specimen1->id, $specimen2->id],
            'action' => 'assign_pathologist',
            'target_user_id' => $this->pathologistUser2->id,
            'reason' => 'Reasignación en lote por guardia médica',
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'count' => 2,
        ]);

    $specimen1->refresh();
    $specimen2->refresh();

    expect($specimen1->users()->pluck('users.id')->toArray())->toEqual([$this->pathologistUser2->id])
        ->and($specimen2->users()->pluck('users.id')->toArray())->toEqual([$this->pathologistUser2->id]);
});

test('bulk reschedule preserves multi-assigned specimens from reassignment', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'B-0030-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    // Multi-assigned to both pathologists
    $specimen->users()->attach([
        $this->pathologistUser1->id => [
            'assigned_by' => $this->adminUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ],
        $this->pathologistUser2->id => [
            'assigned_by' => $this->adminUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ],
    ]);

    $this->actingAs($this->pathologistUser1)
        ->postJson(route('specimens-balance.bulk-reschedule'), [
            'ids' => [$specimen->id],
            'action' => 'assign_pathologist',
            'target_user_id' => 'unassigned',
            'reason' => 'Intento de desasignar muestra multi-patólogo en lote',
        ])
        ->assertSuccessful();

    $specimen->refresh();

    // Reassignment was skipped; both pathologists remain assigned
    expect($specimen->users()->count())->toBe(2);
});

test('durationsData endpoint requires specimens_balance.view permission', function () {
    $this->actingAs($this->unauthorizedUser)
        ->getJson(route('specimens-balance.durations-data'))
        ->assertForbidden();
});

test('durationsData endpoint returns fresh duration settings and pathologists from database', function () {
    // Create an explicit duration in the database
    PathologistExaminationDuration::updateOrCreate(
        [
            'user_id' => $this->pathologistUser1->id,
            'specimen_type_examination_id' => $this->examination1->id,
        ],
        [
            'duration_minutes' => 45,
        ]
    );

    $response = $this->actingAs($this->pathologistUser1)
        ->getJson(route('specimens-balance.durations-data'))
        ->assertSuccessful()
        ->assertJsonStructure([
            'pathologists',
            'durationsMap',
            'filterOptions' => [
                'specimenTypes',
                'examinations',
                'categories',
            ],
            'currentUserId',
            'canManage',
        ]);

    $data = $response->json();
    expect($data['durationsMap'][$this->pathologistUser1->id][$this->examination1->id])->toBe(45);
    expect($data['currentUserId'])->toBe($this->pathologistUser1->id);
    expect($data['canManage'])->toBeTrue();
});

test('expiredList endpoint filters by pathologist_id and unassigned', function () {
    Carbon::setTestNow('2026-10-01 09:00:00');

    $specimenAssigned = Specimen::create([
        'sequence_code' => 'B-0991-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);
    $specimenAssigned->users()->attach($this->pathologistUser1->id);

    $specimenUnassigned = Specimen::create([
        'sequence_code' => 'B-0992-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    Carbon::setTestNow('2026-10-15 09:00:00');

    // Filter by pathologistUser1
    $responseAssigned = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.expired-list', ['pathologist_id' => $this->pathologistUser1->id]))
        ->assertSuccessful();

    $codesAssigned = collect($responseAssigned->json('specimens'))->pluck('sequence_code')->toArray();
    expect($codesAssigned)->toContain('B-0991-10-26');
    expect($codesAssigned)->not->toContain('B-0992-10-26');

    // Filter by unassigned
    $responseUnassigned = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.expired-list', ['pathologist_id' => 'unassigned']))
        ->assertSuccessful();

    $codesUnassigned = collect($responseUnassigned->json('specimens'))->pluck('sequence_code')->toArray();
    expect($codesUnassigned)->toContain('B-0992-10-26');
    expect($codesUnassigned)->not->toContain('B-0991-10-26');

    Carbon::setTestNow();
});

test('expiredList and unassignedList support sort_field and sort_direction', function () {
    Carbon::setTestNow('2026-10-01 09:00:00');

    Specimen::create([
        'sequence_code' => 'B-0001-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    Specimen::create([
        'sequence_code' => 'B-0002-10-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    Carbon::setTestNow('2026-10-15 09:00:00');

    // Unassigned list sorted by sequence_code asc
    $respUnassignedAsc = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.unassigned-list', ['sort_field' => 'sequence_code', 'sort_direction' => 'asc']))
        ->assertSuccessful();

    $codesAsc = collect($respUnassignedAsc->json('specimens'))->pluck('sequence_code')->values()->toArray();
    $firstIdx = array_search('B-0001-10-26', $codesAsc);
    $secondIdx = array_search('B-0002-10-26', $codesAsc);
    expect($firstIdx)->toBeLessThan($secondIdx);

    // Unassigned list sorted by sequence_code desc
    $respUnassignedDesc = $this->actingAs($this->viewerUser)
        ->getJson(route('specimens-balance.unassigned-list', ['sort_field' => 'sequence_code', 'sort_direction' => 'desc']))
        ->assertSuccessful();

    $codesDesc = collect($respUnassignedDesc->json('specimens'))->pluck('sequence_code')->values()->toArray();
    $firstIdxDesc = array_search('B-0001-10-26', $codesDesc);
    $secondIdxDesc = array_search('B-0002-10-26', $codesDesc);
    expect($firstIdxDesc)->toBeGreaterThan($secondIdxDesc);

    Carbon::setTestNow();
});
