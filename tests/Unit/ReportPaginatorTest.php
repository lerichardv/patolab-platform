<?php

use App\Services\ReportPaginator;

test('report paginator paginates image grid and handles base64 images', function () {
    // 1. Create a 1x1 transparent PNG base64 string to use as test image
    $base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // 2. Prepare stub objects for specimen, report, customer, referrer
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-100-26';
    $specimen->diagnosis = 'Gastritis crónica';
    $specimen->anatomic_site = 'Estómago';
    $specimen->created_at = now();
    $specimen->users = collect([
        (object) [
            'name' => 'DRA. ESTEFANY LAGOS',
            'role' => (object) ['name' => 'PATOLOGÍA ONCOLÓGICA'],
        ],
    ]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'macroscopy_html', 'order' => 1, 'active' => true],
    ];
    $report->macroscopy_html = '<div data-type="image-grid" data-columns="2">'.
        '<img src="'.$base64Image.'">'.
        '<img src="'.$base64Image.'">'.
        '</div>';
    $report->report_date = '2026-06-24';
    $report->clinical_details_html = '';
    $report->diagnosis_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Juan Pérez';
    $customer->age = 45;
    $customer->gender = 'M';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Luis Gómez';
    $referrer->notes = 'Clínica Los Andes';

    // 3. Run the paginator
    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, true);

    // 4. Assertions
    expect($pages)->toBeArray();
    expect(count($pages))->toBeGreaterThan(0);

    // Let's find the image-grid block in the pages
    $foundImageGrid = false;
    foreach ($pages as $page) {
        foreach ($page as $block) {
            if ($block['type'] === 'html' && str_contains($block['html'], 'data-type="image-grid"')) {
                $foundImageGrid = true;
                // Assert height is numeric and calculated using dimensions
                expect($block['height'])->toBeGreaterThan(5.3); // grid cost + image row heights
                // Assert justified styles are injected to the img tags
                expect($block['html'])->toContain('object-fit: cover;');
            }
        }
    }
    expect($foundImageGrid)->toBeTrue();
});

test('report paginator formats cuttings summaries using custom cassette codes', function () {
    // 1. Prepare stub objects for specimen, report, customer, referrer
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-100-26';
    $specimen->diagnosis = 'Gastritis crónica';
    $specimen->anatomic_site = 'Estómago';
    $specimen->created_at = now();
    $specimen->users = collect([
        (object) [
            'name' => 'DRA. ESTEFANY LAGOS',
            'role' => (object) ['name' => 'PATOLOGÍA ONCOLÓGICA'],
        ],
    ]);

    // Add cuttings to specimen
    $specimen->cuttings = collect([
        (object) [
            'description' => 'Muestra regular',
            'number_of_cuttings' => 2,
            'is_new_cut' => false,
            'code' => (object) ['code' => 'E'],
        ],
        (object) [
            'description' => 'Muestra regular',
            'number_of_cuttings' => 2,
            'is_new_cut' => false,
            'code' => (object) ['code' => 'A'],
        ],
        (object) [
            'description' => 'Muestra regular',
            'number_of_cuttings' => 1,
            'is_new_cut' => false,
            'code' => (object) ['code' => 'B'],
        ],
        (object) [
            'description' => 'Corte especial',
            'number_of_cuttings' => 1,
            'is_new_cut' => true,
            'code' => (object) ['code' => 'AA'],
        ],
        (object) [
            'description' => 'Corte especial',
            'number_of_cuttings' => 3,
            'is_new_cut' => true,
            'code' => (object) ['code' => 'AB'],
        ],
        (object) [
            'description' => 'Otro corte',
            'number_of_cuttings' => 1,
            'is_new_cut' => true,
            'code' => (object) ['code' => 'BB'],
        ],
        // Non-consecutive cuttings with the same description
        (object) [
            'description' => 'Corte discontinuo',
            'number_of_cuttings' => 2,
            'is_new_cut' => true,
            'code' => (object) ['code' => 'NCA'],
        ],
        (object) [
            'description' => 'Corte discontinuo',
            'number_of_cuttings' => 2,
            'is_new_cut' => true,
            'code' => (object) ['code' => 'NCC'],
        ],
    ]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'macroscopy_html', 'order' => 1, 'active' => true],
    ];
    $report->macroscopy_html = '<p>Macroscopía descripción</p>';
    $report->report_date = '2026-06-24';
    $report->clinical_details_html = '';
    $report->diagnosis_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Juan Pérez';
    $customer->age = 45;
    $customer->gender = 'M';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Luis Gómez';
    $referrer->notes = 'Clínica Los Andes';

    // Run the paginator
    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, true);

    // Look for cuttings-summary and new-cuttings-summary blocks
    $foundCuttingsSummary = null;
    $foundNewCuttingsSummary = null;

    foreach ($pages as $page) {
        foreach ($page as $block) {
            if ($block['type'] === 'cuttings-summary') {
                $foundCuttingsSummary = $block['text'];
            }
            if ($block['type'] === 'new-cuttings-summary') {
                $foundNewCuttingsSummary = $block['text'];
            }
        }
    }

    expect($foundCuttingsSummary)->not->toBeNull();
    expect($foundNewCuttingsSummary)->not->toBeNull();

    // Regular cuttings group 1: A and B with description 'Muestra regular' -> consecutive, grouped.
    // Regular cuttings group 2: E with description 'Muestra regular' -> non-consecutive, separate.
    // Expected output: "Cortes: A-B) Muestra regular 3x2; E) Muestra regular 2x1."
    expect($foundCuttingsSummary)->toBe('Cortes: A-B) Muestra regular 3x2; E) Muestra regular 2x1.');

    // New cuttings group 1: AA and AB with description 'Corte especial' -> consecutive, grouped.
    // New cuttings group 2: BB with description 'Otro corte' -> individual, not grouped.
    // New cuttings group 3: NCA and NCC with description 'Corte discontinuo' -> non-consecutive, split.
    // Format: "Nuevos Cortes: AA-AB) Corte especial 4x2; BB) Otro corte 1x1; NCA) Corte discontinuo 2x1; NCC) Corte discontinuo 2x1."
    expect($foundNewCuttingsSummary)->toBe('Nuevos Cortes: AA-AB) Corte especial 4x2; BB) Otro corte 1x1; NCA) Corte discontinuo 2x1; NCC) Corte discontinuo 2x1.');
});
