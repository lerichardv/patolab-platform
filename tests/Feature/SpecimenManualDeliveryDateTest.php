<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Location;
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
    $this->role = Role::create(['slug' => 'admin', 'name' => 'Administrador']);
    $this->role->permissions()->attach(
        Permission::create(['slug' => 'specimens.view', 'name' => 'Ver Muestras']),
    );
    $this->role->permissions()->attach(
        Permission::create(['slug' => 'specimens.create', 'name' => 'Crear Muestras']),
    );
    $this->role->permissions()->attach(
        Permission::create(['slug' => 'specimens.edit', 'name' => 'Editar Muestras']),
    );
    $this->role->permissions()->attach(
        Permission::create(['slug' => 'reports.delivery.view', 'name' => 'Ver Reporte de Entrega']),
    );

    $this->user = User::factory()->create([
        'name' => 'Admin User',
        'role_id' => $this->role->id,
        'active' => true,
    ]);

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

    $this->customer = Customer::factory()->create();
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Simple',
        'code' => 'BIO-SIM',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Normal 5 días',
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

test('expected_finalization_date accessor uses manual delivery override when enabled', function () {
    Carbon::setTestNow('2026-09-07 10:00:00'); // Monday

    $specimen = Specimen::create([
        'sequence_code' => 'B-0001-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_manual_delivery_date_enabled' => true,
        'delivery_date_unit' => 'days',
        'delivery_date_quantity' => 10,
    ]);

    // Monday Sept 7 + 10 weekdays = Monday Sept 21
    expect($specimen->expected_finalization_date)->not->toBeNull()
        ->and($specimen->expected_finalization_date->format('Y-m-d'))->toBe('2026-09-21');

    // When disabled, it should fall back to category (5 weekdays = Monday Sept 14)
    $specimen->update(['is_manual_delivery_date_enabled' => false]);
    $specimen->refresh();

    expect($specimen->expected_finalization_date->format('Y-m-d'))->toBe('2026-09-14');

    Carbon::setTestNow();
});

test('expected_internal_finalization_date accessor uses manual internal delivery override when enabled', function () {
    Carbon::setTestNow('2026-09-07 10:00:00'); // Monday

    $specimen = Specimen::create([
        'sequence_code' => 'B-0002-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_manual_delivery_date_intern_enabled' => true,
        'delivery_date_intern_unit' => 'days',
        'delivery_date_intern_quantity' => 23,
    ]);

    // Monday Sept 7 + 23 weekdays (skipping 4 weekends) = Thursday Oct 8
    expect($specimen->expected_internal_finalization_date)->not->toBeNull()
        ->and($specimen->expected_internal_finalization_date->format('Y-m-d'))->toBe('2026-10-08');

    // Test with 1 day: Sept 7 + 1 weekday = Tuesday Sept 8
    $specimen->update(['delivery_date_intern_quantity' => 1]);
    $specimen->refresh();
    expect($specimen->expected_internal_finalization_date->format('Y-m-d'))->toBe('2026-09-08');

    // When disabled, fallback to category intern_quantity (3 weekdays = Thursday Sept 10)
    $specimen->update(['is_manual_delivery_date_intern_enabled' => false]);
    $specimen->refresh();

    expect($specimen->expected_internal_finalization_date->format('Y-m-d'))->toBe('2026-09-10');

    Carbon::setTestNow();
});

test('specimen store endpoint persists manual delivery date fields', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['active_location_id' => $this->location->id])
        ->post('/specimens', [
            'customer' => $this->customer->id,
            'specimen_type' => $this->specimenType->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'priority_id' => $this->priority->id,
            'status' => 'received',
            'sample_collection_date' => '2026-09-07',
            'quantity' => 1,
            'amount' => 100,
            'discount' => 0,
            'is_manual_delivery_date_enabled' => true,
            'delivery_date_unit' => 'hours',
            'delivery_date_quantity' => 48,
            'is_manual_delivery_date_intern_enabled' => true,
            'delivery_date_intern_unit' => 'hours',
            'delivery_date_intern_quantity' => 24,
            'payment_type' => 'cash',
        ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $specimen = Specimen::latest('id')->first();
    expect($specimen)->not->toBeNull()
        ->and($specimen->is_manual_delivery_date_enabled)->toBeTrue()
        ->and($specimen->delivery_date_unit)->toBe('hours')
        ->and($specimen->delivery_date_quantity)->toBe(48)
        ->and($specimen->is_manual_delivery_date_intern_enabled)->toBeTrue()
        ->and($specimen->delivery_date_intern_unit)->toBe('hours')
        ->and($specimen->delivery_date_intern_quantity)->toBe(24);
});

test('specimen update endpoint updates manual delivery date fields', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'B-0003-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_manual_delivery_date_enabled' => false,
        'is_manual_delivery_date_intern_enabled' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['active_location_id' => $this->location->id])
        ->put("/specimens/{$specimen->id}", [
            'customer' => $this->customer->id,
            'specimen_type' => $this->specimenType->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'priority_id' => $this->priority->id,
            'status' => 'received',
            'sample_collection_date' => '2026-09-07',
            'is_manual_delivery_date_enabled' => true,
            'delivery_date_unit' => 'weeks',
            'delivery_date_quantity' => 2,
            'is_manual_delivery_date_intern_enabled' => true,
            'delivery_date_intern_unit' => 'days',
            'delivery_date_intern_quantity' => 4,
            'payment_type' => 'cash',
        ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $specimen->refresh();
    expect($specimen->is_manual_delivery_date_enabled)->toBeTrue()
        ->and($specimen->delivery_date_unit)->toBe('weeks')
        ->and($specimen->delivery_date_quantity)->toBe(2)
        ->and($specimen->is_manual_delivery_date_intern_enabled)->toBeTrue()
        ->and($specimen->delivery_date_intern_unit)->toBe('days')
        ->and($specimen->delivery_date_intern_quantity)->toBe(4);
});

test('specimen group store persists manual delivery date fields for each specimen', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['active_location_id' => $this->location->id])
        ->post('/specimen-groups', [
            'global_customer_id' => $this->customer->id,
            'payment_type' => 'cash',
            'specimens' => [
                [
                    'customer' => $this->customer->id,
                    'specimen_type' => $this->specimenType->id,
                    'specimen_type_examination' => $this->examination->id,
                    'specimen_category' => $this->category->id,
                    'referrer' => $this->referrer->id,
                    'priority_id' => $this->priority->id,
                    'status' => 'received',
                    'sample_collection_date' => '2026-09-07',
                    'selected_price' => '100',
                    'quantity' => 1,
                    'is_manual_delivery_date_enabled' => true,
                    'delivery_date_unit' => 'days',
                    'delivery_date_quantity' => 7,
                    'is_manual_delivery_date_intern_enabled' => true,
                    'delivery_date_intern_unit' => 'days',
                    'delivery_date_intern_quantity' => 2,
                ],
            ],
        ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $specimen = Specimen::latest('id')->first();
    expect($specimen)->not->toBeNull()
        ->and($specimen->is_manual_delivery_date_enabled)->toBeTrue()
        ->and($specimen->delivery_date_unit)->toBe('days')
        ->and($specimen->delivery_date_quantity)->toBe(7)
        ->and($specimen->is_manual_delivery_date_intern_enabled)->toBeTrue()
        ->and($specimen->delivery_date_intern_unit)->toBe('days')
        ->and($specimen->delivery_date_intern_quantity)->toBe(2);
});

test('delivery report respects manual expected finalization dates when filtering', function () {
    Carbon::setTestNow('2026-09-07 10:00:00'); // Monday

    // Specimen 1: Category default = 5 weekdays -> Sept 14
    $specimenCategory = Specimen::create([
        'sequence_code' => 'B-0010-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'sample_collection_date' => '2026-09-07',
        'is_manual_delivery_date_enabled' => false,
    ]);

    // Specimen 2: Manual override = 10 weekdays -> Sept 21
    $specimenManual = Specimen::create([
        'sequence_code' => 'B-0011-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'sample_collection_date' => '2026-09-07',
        'is_manual_delivery_date_enabled' => true,
        'delivery_date_unit' => 'days',
        'delivery_date_quantity' => 10,
    ]);

    // Filter delivery report for Sept 18 to Sept 25 (should only match Specimen 2)
    $response = $this->actingAs($this->user)->get(route('reports.delivery.index', [
        'date_from' => '2026-09-18',
        'date_to' => '2026-09-25',
    ]));

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.id', $specimenManual->id)
    );

    Carbon::setTestNow();
});

test('delivery report filters specimens using manual internal delivery override', function () {
    Carbon::setTestNow('2026-09-07 10:00:00'); // Monday

    // Specimen 1: Category default intern = 3 weekdays -> Thursday Sept 10
    $specimenCategory = Specimen::create([
        'sequence_code' => 'B-0020-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'sample_collection_date' => '2026-09-07',
        'is_manual_delivery_date_intern_enabled' => false,
    ]);

    // Specimen 2: Manual internal override = 23 weekdays -> Thursday Oct 8
    $specimenManual = Specimen::create([
        'sequence_code' => 'B-0021-09-26',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'sample_collection_date' => '2026-09-07',
        'is_manual_delivery_date_intern_enabled' => true,
        'delivery_date_intern_unit' => 'days',
        'delivery_date_intern_quantity' => 23,
    ]);

    // Filter by internal date Oct 01 to Oct 15 (should only match Specimen 2)
    $response = $this->actingAs($this->user)->get(route('reports.delivery.index', [
        'internal_date_from' => '2026-10-01',
        'internal_date_to' => '2026-10-15',
    ]));

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.id', $specimenManual->id)
    );

    Carbon::setTestNow();
});
