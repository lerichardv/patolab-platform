<?php

use App\Models\AuditLog;
use App\Models\SpecimenReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('specimen report audits html columns but ignores blob columns when logging audits on create and update', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $report = SpecimenReport::create([
        'report_date' => '2026-08-25',
        'macroscopy_html' => '<p>Macroscopic description</p>',
        'microscopy_html' => '<p>Microscopic description</p>',
        'diagnosis_html' => '<p>Diagnosis text</p>',
        'clinical_details_html' => '<p>Clinical details</p>',
        'yjs_macroscopy_state' => 'binary-state-vector-macro',
        'yjs_microscopy_state' => 'binary-state-vector-micro',
    ]);

    // Check that report_date is audited
    expect(AuditLog::where('table', 'specimen_reports')
        ->where('row_id', $report->id)
        ->where('column', 'report_date')
        ->where('action', 'create')
        ->exists())->toBeTrue();

    // Check that html columns are audited on create
    $htmlColumns = [
        'macroscopy_html',
        'microscopy_html',
        'diagnosis_html',
        'clinical_details_html',
    ];

    foreach ($htmlColumns as $column) {
        expect(AuditLog::where('table', 'specimen_reports')
            ->where('row_id', $report->id)
            ->where('column', $column)
            ->where('action', 'create')
            ->exists())->toBeTrue();
    }

    // Check that yjs/blob columns are NOT audited on create
    $ignoredColumns = [
        'yjs_macroscopy_state',
        'yjs_microscopy_state',
    ];

    foreach ($ignoredColumns as $column) {
        expect(AuditLog::where('table', 'specimen_reports')
            ->where('row_id', $report->id)
            ->where('column', $column)
            ->exists())->toBeFalse();
    }

    // Update the report with new html and non-ignored field
    $report->update([
        'finalization_date' => '2026-08-26',
        'macroscopy_html' => '<p>Updated macroscopy</p>',
        'diagnosis_html' => '<p>Updated diagnosis</p>',
    ]);

    // finalization_date must be audited
    expect(AuditLog::where('table', 'specimen_reports')
        ->where('row_id', $report->id)
        ->where('column', 'finalization_date')
        ->where('action', 'update')
        ->exists())->toBeTrue();

    // Updated html fields must be audited
    expect(AuditLog::where('table', 'specimen_reports')
        ->where('row_id', $report->id)
        ->where('column', 'macroscopy_html')
        ->where('action', 'update')
        ->exists())->toBeTrue();

    expect(AuditLog::where('table', 'specimen_reports')
        ->where('row_id', $report->id)
        ->where('column', 'diagnosis_html')
        ->where('action', 'update')
        ->exists())->toBeTrue();
});
