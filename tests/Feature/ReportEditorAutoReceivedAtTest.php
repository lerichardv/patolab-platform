<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\SpecimenStatusService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
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

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Examen General',
        'code' => 'EG',
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Categoría A',
        'quantity' => 1,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Clínica',
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

    Carbon::setTestNow('2026-09-01 10:00:00');

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'access_token' => 'test-access-token',
        'delivery_token' => 'test-delivery-token',
    ]);

    $this->report = SpecimenReport::create([
        'specimen_id' => $this->specimen->id,
        'report_date' => '2026-09-01',
        'finalization_date' => '2026-09-01',
    ]);

    $this->specimen->update(['report_id' => $this->report->id]);

    $this->user = User::factory()->create();

    $this->specimen->users()->attach($this->user->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    Carbon::setTestNow();
});

test('specimen defaults auto_received_at to true', function () {
    expect($this->specimen->auto_received_at)->toBeTrue();
});

test('save endpoint can toggle auto_received_at to false and set manual reception date', function () {
    $this->actingAs($this->user);

    $response = $this->postJson(
        route('specimens.report-editor.save', $this->specimen->sequence_code),
        [
            'auto_received_at' => false,
            'received_at' => '2026-08-15',
            'report_date' => '2026-08-15',
        ]
    );

    $response->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('specimen.auto_received_at', false);

    $this->specimen->refresh();
    $this->report->refresh();

    expect($this->specimen->auto_received_at)->toBeFalse()
        ->and($this->specimen->received_at->format('Y-m-d'))->toBe('2026-08-15')
        ->and($this->report->report_date->format('Y-m-d'))->toBe('2026-08-15');
});

test('save endpoint restores automatic reception date when toggling auto_received_at back to true', function () {
    $this->actingAs($this->user);

    // Set manually first
    $this->postJson(
        route('specimens.report-editor.save', $this->specimen->sequence_code),
        [
            'auto_received_at' => false,
            'received_at' => '2026-07-20',
            'report_date' => '2026-07-20',
        ]
    );

    $this->specimen->refresh();
    expect($this->specimen->received_at->format('Y-m-d'))->toBe('2026-07-20');

    // Toggle back to auto
    $response = $this->postJson(
        route('specimens.report-editor.save', $this->specimen->sequence_code),
        [
            'auto_received_at' => true,
        ]
    );

    $response->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('specimen.auto_received_at', true);

    $this->specimen->refresh();
    $this->report->refresh();

    // Should have restored original date from creation (2026-09-01)
    expect($this->specimen->auto_received_at)->toBeTrue()
        ->and($this->specimen->received_at->format('Y-m-d'))->toBe('2026-09-01')
        ->and($this->report->report_date->format('Y-m-d'))->toBe('2026-09-01');
});

test('status transition preserves manual received_at when auto_received_at is false', function () {
    $this->specimen->update([
        'auto_received_at' => false,
        'received_at' => Carbon::parse('2026-05-10 08:00:00'),
    ]);

    Carbon::setTestNow('2026-09-21 12:00:00');

    $statusService = app(SpecimenStatusService::class);
    $statusService->transition($this->specimen, 'received', ['user' => $this->user, 'bypass_validation' => true]);

    $this->specimen->refresh();

    expect($this->specimen->received_at->format('Y-m-d H:i:s'))->toBe('2026-05-10 08:00:00');

    Carbon::setTestNow();
});
