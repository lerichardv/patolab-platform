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
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $department = Department::create(['name' => 'Cortés', 'code' => '05']);
    $municipality = Municipality::create(['department_id' => $department->id, 'name' => 'SPS', 'code' => '0501']);
    $customer = Customer::factory()->create(['state' => $department->id, 'city' => $municipality->id, 'active' => true]);
    $specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $examination = SpecimenTypeExamination::create(['specimen_type' => $specimenType->id, 'name' => 'Examen', 'code' => 'EX']);
    $category = SpecimenCategory::create(['name' => 'Cat A', 'quantity' => 1]);
    $referrerType = ReferrerType::create(['name' => 'Clínica']);
    $referrer = Referrer::create(['name' => 'Dr. Smith', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Media', 'color' => '#f59e0b', 'order' => 1, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $customer->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'status' => 'received',
        'access_token' => 'test-access-token',
        'delivery_token' => 'test-delivery-token',
    ]);

    $this->report = SpecimenReport::create([
        'specimen_id' => $specimen->id,
        'report_date' => '2026-08-27',
        'sections_order' => [],   // SectionsOrderCast requires array
        'headings_toggles' => null,
    ]);

    $specimen->update(['report_id' => $this->report->id]);
});

/**
 * Build a JSON-encoded webhook payload for an onChange event.
 */
function jsonPayload(int $reportId, string $field, string $html): array
{
    return [
        'event' => 'onChange',
        'payload' => [
            'documentName' => "report-{$reportId}-{$field}",
            'html' => $html,
            'document' => null,
        ],
    ];
}

describe('sanitizeJsonField — sections_order', function () {
    it('persists valid JSON unchanged', function () {
        $valid = '[{"key":"macroscopy","order":0,"active":true}]';

        $this->postJson('/api/collaboration', jsonPayload($this->report->id, 'sections_order', $valid))
            ->assertOk()
            ->assertJson(['status' => 'success']);

        expect(
            DB::table('specimen_reports')->where('id', $this->report->id)->value('sections_order')
        )->toBe($valid);
    });

    it('extracts last valid JSON from concatenated string (Yjs CRDT collision)', function () {
        $first = '[{"key":"macroscopy","order":0,"active":true}]';
        $second = '[{"key":"diagnosis","order":1,"active":false}]';

        $this->postJson('/api/collaboration', jsonPayload($this->report->id, 'sections_order', $first.$second))
            ->assertOk();

        $stored = DB::table('specimen_reports')->where('id', $this->report->id)->value('sections_order');
        expect(json_validate($stored))->toBeTrue();
        expect($stored)->toBe($second);
    });

    it('falls back to [] when value is completely invalid JSON', function () {
        $this->postJson('/api/collaboration', jsonPayload($this->report->id, 'sections_order', 'not-json-at-all'))
            ->assertOk();

        $stored = DB::table('specimen_reports')->where('id', $this->report->id)->value('sections_order');
        expect(json_validate($stored))->toBeTrue();
    });
});

describe('sanitizeJsonField — headings_toggles', function () {
    it('persists valid JSON unchanged', function () {
        $valid = '{"macroscopy":true,"diagnosis":false}';

        $this->postJson('/api/collaboration', jsonPayload($this->report->id, 'headings_toggles', $valid))
            ->assertOk()
            ->assertJson(['status' => 'success']);

        expect(
            DB::table('specimen_reports')->where('id', $this->report->id)->value('headings_toggles')
        )->toBe($valid);
    });

    it('extracts last valid JSON from concatenated string (Yjs CRDT collision)', function () {
        $first = '{"macroscopy":true}';
        $second = '{"diagnosis":false}';

        $this->postJson('/api/collaboration', jsonPayload($this->report->id, 'headings_toggles', $first.$second))
            ->assertOk();

        $stored = DB::table('specimen_reports')->where('id', $this->report->id)->value('headings_toggles');
        expect(json_validate($stored))->toBeTrue();
        expect($stored)->toBe($second);
    });

    it('falls back to {} when value is completely invalid JSON', function () {
        $this->postJson('/api/collaboration', jsonPayload($this->report->id, 'headings_toggles', 'corrupted!!'))
            ->assertOk();

        $stored = DB::table('specimen_reports')->where('id', $this->report->id)->value('headings_toggles');
        expect(json_validate($stored))->toBeTrue();
    });
});
