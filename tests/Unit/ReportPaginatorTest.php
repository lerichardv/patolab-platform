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
                // Assert aspect-ratio style is injected to the img tags
                expect($block['html'])->toContain('style="aspect-ratio: 1 / 1; object-fit: cover;"');
            }
        }
    }
    expect($foundImageGrid)->toBeTrue();
});
