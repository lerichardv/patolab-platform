<?php

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->customer = Customer::factory()->create();
    $this->location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);
    $this->type = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $this->category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
        'active' => true,
    ]);
    $this->referrerType = ReferrerType::create([
        'name' => 'Tipo de Referente',
        'active' => true,
    ]);
    $this->referrer = Referrer::create([
        'name' => 'Referente',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#3b82f6', 'order' => 1, 'active' => true]);
});

test('backfill status dates command updates missing date columns from audit log', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'status' => 'processing',
        'active' => true,
    ]);

    // Clear all status date columns on specimen to simulate legacy data
    DB::table('specimen')->where('id', $specimen->id)->update([
        'received_at' => null,
        'macroscopic_review_at' => null,
        'processing_at' => null,
        'microscopic_review_at' => null,
        'finalized_at' => null,
        'delivered_at' => null,
        'cancelled_at' => null,
    ]);

    // Create AuditLog entries via DB::table to set created_at explicitly
    DB::table('audit_log')->insert([
        [
            'audit_session_code' => 'session001',
            'action' => 'create',
            'table' => 'specimen',
            'row_id' => $specimen->id,
            'column' => 'status',
            'old_value' => null,
            'new_value' => 'received',
            'user' => $this->user->id,
            'created_at' => '2026-08-01 10:00:00',
            'updated_at' => '2026-08-01 10:00:00',
        ],
        [
            'audit_session_code' => 'session002',
            'action' => 'update',
            'table' => 'specimen',
            'row_id' => $specimen->id,
            'column' => 'status',
            'old_value' => 'received',
            'new_value' => 'macroscopic_review',
            'user' => $this->user->id,
            'created_at' => '2026-08-02 11:30:00',
            'updated_at' => '2026-08-02 11:30:00',
        ],
        [
            'audit_session_code' => 'session003',
            'action' => 'update',
            'table' => 'specimen',
            'row_id' => $specimen->id,
            'column' => 'status',
            'old_value' => 'macroscopic_review',
            'new_value' => 'processing',
            'user' => $this->user->id,
            'created_at' => '2026-08-03 14:15:00',
            'updated_at' => '2026-08-03 14:15:00',
        ],
    ]);

    $this->artisan('specimens:backfill-status-dates')
        ->expectsOutput('Fetching audit logs for specimen status changes...')
        ->expectsOutput('Processing specimens...')
        ->assertExitCode(0);

    $specimen->refresh();

    expect($specimen->received_at)->not->toBeNull();
    expect($specimen->received_at->format('Y-m-d H:i:s'))->toBe('2026-08-01 10:00:00');
    expect($specimen->macroscopic_review_at->format('Y-m-d H:i:s'))->toBe('2026-08-02 11:30:00');
    expect($specimen->processing_at->format('Y-m-d H:i:s'))->toBe('2026-08-03 14:15:00');
    expect($specimen->microscopic_review_at)->toBeNull();
    expect($specimen->finalized_at)->toBeNull();
});

test('backfill status dates command respects --dry-run option', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'status' => 'received',
        'active' => true,
    ]);

    DB::table('specimen')->where('id', $specimen->id)->update([
        'received_at' => null,
    ]);

    DB::table('audit_log')->insert([
        'audit_session_code' => 'session004',
        'action' => 'create',
        'table' => 'specimen',
        'row_id' => $specimen->id,
        'column' => 'status',
        'old_value' => null,
        'new_value' => 'received',
        'user' => $this->user->id,
        'created_at' => '2026-08-05 09:00:00',
        'updated_at' => '2026-08-05 09:00:00',
    ]);

    $this->artisan('specimens:backfill-status-dates --dry-run')
        ->expectsOutput('Running in dry-run mode. No database changes will be saved.')
        ->assertExitCode(0);

    $specimen->refresh();

    expect($specimen->received_at)->toBeNull();
});

test('backfill status dates command preserves existing dates unless --force is passed', function () {
    $existingReceivedAt = Carbon::parse('2026-07-01 08:00:00');

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0003-08-2026',
        'customer' => $this->customer->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'status' => 'received',
        'received_at' => $existingReceivedAt,
        'active' => true,
    ]);

    DB::table('audit_log')->insert([
        'audit_session_code' => 'session005',
        'action' => 'create',
        'table' => 'specimen',
        'row_id' => $specimen->id,
        'column' => 'status',
        'old_value' => null,
        'new_value' => 'received',
        'user' => $this->user->id,
        'created_at' => '2026-08-01 10:00:00',
        'updated_at' => '2026-08-01 10:00:00',
    ]);

    // Without --force, existing date is preserved
    $this->artisan('specimens:backfill-status-dates')
        ->assertExitCode(0);

    $specimen->refresh();
    expect($specimen->received_at->format('Y-m-d H:i:s'))->toBe('2026-07-01 08:00:00');

    // With --force, existing date is overwritten by audit log date
    $this->artisan('specimens:backfill-status-dates --force')
        ->assertExitCode(0);

    $specimen->refresh();
    expect($specimen->received_at->format('Y-m-d H:i:s'))->toBe('2026-08-01 10:00:00');
});
