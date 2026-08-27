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
        'name' => 'John Doe',
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
        'name' => 'Dr. Smith',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Media',
        'color' => '#f59e0b',
        'order' => 1,
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
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
        'report_date' => '2026-08-27',
        'macroscopy_html' => '<p>Old macroscopy</p>',
        'microscopy_html' => '<p>Old microscopy</p>',
        'diagnosis_html' => '<p>Old diagnosis</p>',
    ]);

    DB::table('specimen_reports')->where('id', $this->report->id)->update([
        'yjs_macroscopy_state' => 'stale-base64-blob',
        'yjs_microscopy_state' => 'stale-base64-blob',
        'yjs_diagnosis_state' => 'stale-base64-blob',
    ]);

    $this->report->refresh();

    $this->specimen->update(['report_id' => $this->report->id]);

    $this->user = User::factory()->create();

    $this->specimen->users()->attach($this->user->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);
});

test('save endpoint updates HTML content without overwriting Yjs blob columns', function () {
    $this->actingAs($this->user);

    $response = $this->postJson(
        route('specimens.report-editor.save', $this->specimen->sequence_code),
        [
            'macroscopy_html' => '<p>Updated macroscopy</p>',
            'microscopy_html' => '<p>Updated microscopy</p>',
            'diagnosis_html' => '<p>Updated diagnosis</p>',
        ]
    );

    $response->assertOk()
        ->assertJsonPath('status', 'success');

    $this->report->refresh();

    // HTML columns should be updated
    expect($this->report->macroscopy_html)->toBe('<p>Updated macroscopy</p>')
        ->and($this->report->microscopy_html)->toBe('<p>Updated microscopy</p>')
        ->and($this->report->diagnosis_html)->toBe('<p>Updated diagnosis</p>');

    // Yjs blob columns should NOT have been touched (still the original values)
    expect($this->report->yjs_macroscopy_state)->toBe('stale-base64-blob')
        ->and($this->report->yjs_microscopy_state)->toBe('stale-base64-blob')
        ->and($this->report->yjs_diagnosis_state)->toBe('stale-base64-blob');
});

test('save endpoint rejects yjs_*_state validation fields', function () {
    $this->actingAs($this->user);

    $response = $this->postJson(
        route('specimens.report-editor.save', $this->specimen->sequence_code),
        [
            'macroscopy_html' => '<p>Updated</p>',
            'yjs_macroscopy_state' => 'should-be-ignored',
        ]
    );

    // The request should still succeed (extra fields are ignored, not rejected)
    $response->assertOk();

    $this->report->refresh();

    // The Yjs blob should remain unchanged — the save endpoint ignores it
    expect($this->report->yjs_macroscopy_state)->toBe('stale-base64-blob');
});

test('save endpoint persists open_text_html and addendum_html', function () {
    $this->actingAs($this->user);

    $response = $this->postJson(
        route('specimens.report-editor.save', $this->specimen->sequence_code),
        [
            'open_text_html' => '<p>Open text content</p>',
            'addendum_html' => '<p>Addendum content</p>',
            'open_text_label' => 'Notas',
        ]
    );

    $response->assertOk();

    $this->report->refresh();

    expect($this->report->open_text_html)->toBe('<p>Open text content</p>')
        ->and($this->report->addendum_html)->toBe('<p>Addendum content</p>')
        ->and($this->report->open_text_label)->toBe('Notas');
});
