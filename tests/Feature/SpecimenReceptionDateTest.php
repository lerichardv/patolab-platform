<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Location;
use App\Models\Municipality;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-09-01 10:00:00');

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
        'name' => 'Jane Doe',
        'active' => true,
    ]);

    $this->location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $this->sequence = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 9,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'A1B2C3D4-5678-90AB-CDEF',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2027-12-31',
        'status' => 'active',
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Examen General',
        'code' => 'EG',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Categoría A',
        'quantity' => 1,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Clínica',
        'active' => true,
    ]);

    $this->referrer = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Media',
        'color' => '#f59e0b',
        'order' => 1,
        'active' => true,
    ]);

    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    Gate::define('specimens.create', fn () => true);
    Gate::define('specimens.edit', fn () => true);
    Gate::define('specimens.view', fn () => true);
    Gate::define('report_editor.view', fn () => true);
});

test('cashier can create a specimen with auto_received_at true and date is set automatically', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'auto_received_at' => true,
        'received_at' => '2026-09-01',
        'quantity' => 1,
        'amount' => 500,
        'discount' => 0,
        'payment_type' => 'cash',
    ]);

    $response->assertSessionHasNoErrors();

    $specimen = Specimen::latest('id')->first();
    expect($specimen)->not->toBeNull()
        ->and($specimen->auto_received_at)->toBeTrue()
        ->and($specimen->received_at->format('Y-m-d'))->toBe('2026-09-01');
});

test('cashier can create a specimen with manual reception date and auto_received_at false', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'auto_received_at' => false,
        'received_at' => '2026-08-15',
        'quantity' => 1,
        'amount' => 500,
        'discount' => 0,
        'payment_type' => 'cash',
    ]);

    $response->assertSessionHasNoErrors();

    $specimen = Specimen::latest('id')->first();
    expect($specimen)->not->toBeNull()
        ->and($specimen->auto_received_at)->toBeFalse()
        ->and($specimen->received_at->format('Y-m-d'))->toBe('2026-08-15');
});

test('report editor inherits cashier manual reception date without pathologist having to change it', function () {
    $this->actingAs($this->user);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-09-2026',
        'customer' => $this->customer->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'auto_received_at' => false,
        'received_at' => Carbon::parse('2026-08-20 00:00:00'),
        'access_token' => 'test-token',
        'delivery_token' => 'test-del-token',
    ]);

    // Save report in editor
    $response = $this->postJson(
        route('specimens.report-editor.save', $specimen->sequence_code),
        [
            'diagnosis_html' => '<p>Diagnostic details</p>',
        ]
    );
    $response->assertOk();

    $specimen->refresh();
    $report = $specimen->report;

    expect($report)->not->toBeNull()
        ->and($specimen->auto_received_at)->toBeFalse()
        ->and($report->report_date->format('Y-m-d'))->toBe('2026-08-20');
});

test('updating specimen updates auto_received_at, received_at and syncs existing report report_date', function () {
    $this->actingAs($this->user);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-09-2026',
        'customer' => $this->customer->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'auto_received_at' => true,
        'received_at' => Carbon::parse('2026-09-01 10:00:00'),
        'access_token' => 'test-token',
        'delivery_token' => 'test-del-token',
    ]);

    $report = SpecimenReport::create([
        'specimen_id' => $specimen->id,
        'report_date' => '2026-09-01',
        'finalization_date' => '2026-09-01',
    ]);
    $specimen->update(['report_id' => $report->id]);

    // Update to manual date
    $response = $this->put(route('specimens.update', $specimen->id), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'auto_received_at' => false,
        'received_at' => '2026-08-10',
    ]);

    $response->assertSessionHasNoErrors();

    $specimen->refresh();
    $report->refresh();

    expect($specimen->auto_received_at)->toBeFalse()
        ->and($specimen->received_at->format('Y-m-d'))->toBe('2026-08-10')
        ->and($report->report_date->format('Y-m-d'))->toBe('2026-08-10');

    // Update back to auto
    $response = $this->put(route('specimens.update', $specimen->id), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'auto_received_at' => true,
    ]);

    $response->assertSessionHasNoErrors();

    $specimen->refresh();
    $report->refresh();

    expect($specimen->auto_received_at)->toBeTrue()
        ->and($report->report_date->format('Y-m-d'))->toBe($specimen->received_at->format('Y-m-d'));
});

test('cashier can create a specimen group with mixed auto and manual reception dates', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('specimen-groups.store'), [
        'global_customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'specimens' => [
            [
                'customer' => $this->customer->id,
                'specimen_type' => $this->specimenType->id,
                'specimen_type_examination' => $this->examination->id,
                'specimen_category' => $this->category->id,
                'referrer' => $this->referrer->id,
                'status' => 'received',
                'priority_id' => $this->priority->id,
                'selected_price' => 'regular',
                'quantity' => 1,
                'auto_received_at' => true,
                'received_at' => '2026-09-01',
                'examinations' => [
                    [
                        'examination_id' => $this->examination->id,
                        'quantity' => 1,
                        'selected_price' => 'regular',
                    ],
                ],
            ],
            [
                'customer' => $this->customer->id,
                'specimen_type' => $this->specimenType->id,
                'specimen_type_examination' => $this->examination->id,
                'specimen_category' => $this->category->id,
                'referrer' => $this->referrer->id,
                'status' => 'received',
                'priority_id' => $this->priority->id,
                'selected_price' => 'regular',
                'quantity' => 1,
                'auto_received_at' => false,
                'received_at' => '2026-08-25',
                'examinations' => [
                    [
                        'examination_id' => $this->examination->id,
                        'quantity' => 1,
                        'selected_price' => 'regular',
                    ],
                ],
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $group = SpecimenGroup::latest('id')->first();
    expect($group)->not->toBeNull();

    $specimens = $group->specimens()->orderBy('id', 'asc')->get();
    expect($specimens)->toHaveCount(2);

    $specimen1 = $specimens[0];
    $specimen2 = $specimens[1];

    expect($specimen1->auto_received_at)->toBeTrue()
        ->and($specimen1->received_at->format('Y-m-d'))->toBe('2026-09-01')
        ->and($specimen2->auto_received_at)->toBeFalse()
        ->and($specimen2->received_at->format('Y-m-d'))->toBe('2026-08-25');
});
