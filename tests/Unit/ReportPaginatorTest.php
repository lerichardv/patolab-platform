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
})->skip('Temporarily disabled');

test('report paginator enforces keep_with_next on section headers preventing orphaned titles', function () {
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-101-26';
    $specimen->diagnosis = 'Apendicitis';
    $specimen->anatomic_site = 'Apéndice cecal';
    $specimen->users = collect([]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'clinical_details_html', 'order' => 1, 'active' => true],
        ['key' => 'diagnosis_html', 'order' => 2, 'active' => true],
    ];

    // Create clinical details that take up almost all of Page 1 budget
    // Page 1 budget is ~170mm (205 - patient card ~35mm).
    // ~90 repetitions of this sentence gives ~45 lines (~160mm), leaving ~10mm.
    // The diagnosis section header (7.94mm) + min next content (2 lines ~7mm) will NOT fit in 10mm.
    // So keep_with_next must push the DIAGNÓSTICO header to Page 2!
    $longParagraph = str_repeat('Texto largo de datos clínicos del paciente para llenar la primera página del reporte médico de patología. ', 90);
    $report->clinical_details_html = '<p>'.$longParagraph.'</p>';
    $report->diagnosis_html = '<p>Diagnóstico final definitivo.</p>';

    $customer = new stdClass;
    $customer->name = 'María Rodríguez';
    $customer->age = 30;
    $customer->gender = 'F';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Carlos Mendoza';
    $referrer->notes = 'Hospital General';

    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);

    expect(count($pages))->toBeGreaterThanOrEqual(2);

    // Verify Page 1 has patient-card and clinical details, but NOT the DIAGNÓSTICO header
    $page1Headers = array_filter($pages[0], fn ($b) => ($b['type'] ?? '') === 'section-header' && ($b['title'] ?? '') === 'DIAGNÓSTICO');
    expect($page1Headers)->toBeEmpty();

    // Verify Page 2 starts with or contains DIAGNÓSTICO header followed by its content
    $page2Headers = array_filter($pages[1], fn ($b) => ($b['type'] ?? '') === 'section-header' && ($b['title'] ?? '') === 'DIAGNÓSTICO');
    expect($page2Headers)->not->toBeEmpty();
});

test('report paginator balances paragraph splitting with orphan and widow controls', function () {
    // Test paragraph splitting across pages with 30mm page budget
    // 15 lines of text (~53mm) across 30mm page height -> will split across 2 pages
    $blocks = [
        [
            'id' => 'splittable-p',
            'type' => 'paragraph',
            'tag' => 'p',
            'html' => '<p>'.str_repeat('Párrafo de prueba que tiene varias líneas de texto para verificar el control de viudas y huérfanas en el paginador. ', 15).'</p>',
        ],
    ];

    $pages = ReportPaginator::paginateBlocks($blocks, 30.0, 3.53, 155);

    expect(count($pages))->toBe(2);

    // Page 1 should have first slice of paragraph
    expect($pages[0])->not->toBeEmpty();
    expect($pages[0][0]['html'])->toContain('Párrafo de prueba');

    // Page 2 should have continuation slice of paragraph
    expect($pages[1])->not->toBeEmpty();
    expect($pages[1][0]['html'])->toContain('Párrafo de prueba');
});

test('report paginator splits tables across pages with repeating header rows', function () {
    $tableHtml = '<table class="section-content">'.
        '<thead><tr><th>Parámetro</th><th>Resultado</th><th>Unidad</th><th>Referencia</th></tr></thead>'.
        '<tbody>'.
        '<tr><td>Hemoglobina</td><td>14.5</td><td>g/dL</td><td>12.0 - 16.0</td></tr>'.
        '<tr><td>Hematocrito</td><td>42.0</td><td>%</td><td>37.0 - 47.0</td></tr>'.
        '<tr><td>Leucocitos</td><td>6,500</td><td>/uL</td><td>4,500 - 11,000</td></tr>'.
        '<tr><td>Plaquetas</td><td>250,000</td><td>/uL</td><td>150,000 - 450,000</td></tr>'.
        '<tr><td>Glucosa</td><td>95</td><td>mg/dL</td><td>70 - 100</td></tr>'.
        '<tr><td>Creatinina</td><td>0.9</td><td>mg/dL</td><td>0.6 - 1.2</td></tr>'.
        '<tr><td>Urea</td><td>28</td><td>mg/dL</td><td>15 - 45</td></tr>'.
        '<tr><td>Colesterol</td><td>180</td><td>mg/dL</td><td>< 200</td></tr>'.
        '<tr><td>Triglicéridos</td><td>120</td><td>mg/dL</td><td>< 150</td></tr>'.
        '<tr><td>Ácido Úrico</td><td>5.2</td><td>mg/dL</td><td>3.5 - 7.2</td></tr>'.
        '<tr><td>Proteína C Reactiva</td><td>1.2</td><td>mg/L</td><td>< 5.0</td></tr>'.
        '<tr><td>Ferritina</td><td>110</td><td>ng/mL</td><td>30 - 400</td></tr>'.
        '</tbody></table>';

    // 125 repetitions of 64 chars = ~8000 chars (~50 lines * 3.53 = ~176mm, leaving ~29mm for table header + 1 row)
    $blocks = [
        [
            'id' => 'pre-table',
            'type' => 'paragraph',
            'tag' => 'p',
            'html' => '<p>'.str_repeat('Texto largo previo para dejar poco espacio antes de la tabla. ', 125).'</p>',
            'height' => 176.0,
        ],
        [
            'id' => 'lab-table',
            'type' => 'table',
            'html' => $tableHtml,
            'height' => 80.0,
        ],
    ];

    $pages = ReportPaginator::paginateBlocks($blocks, 205.0, 3.53, 155);
    expect(count($pages))->toBe(2);

    // Verify both pages have a table slice with <thead> containing the repeated header
    $page1Table = array_filter($pages[0], fn ($b) => str_contains($b['html'] ?? '', '<table'));
    $page2Table = array_filter($pages[1], fn ($b) => str_contains($b['html'] ?? '', '<table'));

    expect($page1Table)->not->toBeEmpty();
    expect($page2Table)->not->toBeEmpty();

    $p1Html = reset($page1Table)['html'];
    $p2Html = reset($page2Table)['html'];

    expect($p1Html)->toContain('<thead>');
    expect($p1Html)->toContain('Parámetro');
    expect($p2Html)->toContain('<thead>');
    expect($p2Html)->toContain('Parámetro');
});

test('report paginator correctly classifies and paginates Word imported tables wrapped in div.tableWrapper', function () {
    $wordTableHtml = '<div class="tableWrapper"><table style="min-width: 290px;"><colgroup><col style="min-width: 25px;"><col style="width: 240px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>CATEGORÍA DIAGNOSTICA</p></th><th colspan="1" rowspan="1" colwidth="240"><p>RIESGO DE MALIGNIDAD</p><p>Media % (Rango)</p></th><th colspan="1" rowspan="1"><p>MANEJO USUAL</p></th></tr><tr><td colspan="1" rowspan="1"><p>I.&nbsp;&nbsp; NO DIAGNOSTICA</p></td><td colspan="1" rowspan="1" colwidth="240"><p>13 (5–20)</p></td><td colspan="1" rowspan="1"><p>REPETIR PAAF GUIADA POR ULTRASONIDO</p></td></tr><tr><td colspan="1" rowspan="1"><p>II.&nbsp; BENIGNO</p></td><td colspan="1" rowspan="1" colwidth="240"><p>4 (2–7)</p></td><td colspan="1" rowspan="1"><p>SEGUIMIENTO CLÍNICO Y SONOGRÁFICO</p></td></tr><tr><td colspan="1" rowspan="1"><p>III. ATIPIA DE SIGNIFICADO INDETERMINADO/ASI</p></td><td colspan="1" rowspan="1" colwidth="240"><p>22 (13–30)</p></td><td colspan="1" rowspan="1"><p>REPETIR PAAF, TEST MOLECULARES, LOBECTOMÍA DIAGNÓSTICA O VIGILANCIA</p></td></tr><tr><td colspan="1" rowspan="1"><p>IV.&nbsp; NEOPLASIA FOLICULAR/NF</p></td><td colspan="1" rowspan="1" colwidth="240"><p>30 (23–34)</p></td><td colspan="1" rowspan="1"><p>TEST MOLECULARES O LOBECTOMÍA</p></td></tr><tr><td colspan="1" rowspan="1"><p>V.&nbsp;&nbsp; SOSPECHOSO POR MALIGNIDAD</p></td><td colspan="1" rowspan="1" colwidth="240"><p>74 (67–83)</p></td><td colspan="1" rowspan="1"><p>TEST MOLECULARES, TIROIDECTOMÍA TOTAL O LOBECTOMÍA</p></td></tr><tr><td colspan="1" rowspan="1"><p>VI.&nbsp; MALIGNO</p></td><td colspan="1" rowspan="1" colwidth="240"><p>97 (97–100)</p></td><td colspan="1" rowspan="1"><p>TIROIDECTOMÍA TOTAL O LOBECTOMÍA</p></td></tr></tbody></table></div>';

    // 1. Verify classifyBlock classifies it as 'table'
    $classified = ReportPaginator::classifyBlock($wordTableHtml, 155);
    expect($classified['type'])->toBe('table');

    // 2. Verify pagination when there is limited space on Page 1
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-104-26';
    $specimen->diagnosis = 'Nódulo tiroideo';
    $specimen->anatomic_site = 'Tiroides';
    $specimen->users = collect([]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'open_text_html', 'order' => 1, 'active' => true],
    ];
    $introText = '<p>'.str_repeat('Párrafo de texto descriptivo previo a la tabla de Bethesda de nódulo tiroideo. ', 90).'</p>';
    $report->open_text_html = $introText.$wordTableHtml.'<p>Texto posterior a la tabla.</p>';
    $report->open_text_label = 'Texto Libre';
    $report->clinical_details_html = '';
    $report->diagnosis_html = '';
    $report->macroscopy_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Carlos Flores';
    $customer->age = 42;
    $customer->gender = 'M';

    $referrer = new stdClass;
    $referrer->name = 'Dra. Patricia Ramos';
    $referrer->notes = 'Endocrinología';

    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);

    // Must split across pages
    expect(count($pages))->toBeGreaterThanOrEqual(2);

    // Page 2 should have table continuation with repeating header
    $page2Tables = array_filter($pages[1], fn ($b) => str_contains($b['html'] ?? '', '<table'));
    expect($page2Tables)->not->toBeEmpty();
    $p2TableHtml = reset($page2Tables)['html'];
    expect($p2TableHtml)->toContain('CATEGORÍA DIAGNOSTICA');
    expect($p2TableHtml)->toContain('colgroup');
});

test('report paginator correctly retains and measures empty paragraphs', function () {
    $sectionHtml = '<p>Texto 1</p><p></p><p><br></p><p>Texto 2</p>';

    // 1. Verify isEmptyHtml is false for this HTML since it contains multiple blocks / text
    expect(ReportPaginator::isEmptyHtml($sectionHtml))->toBeFalse();

    // 2. Parse HTML into blocks
    $blocks = ReportPaginator::parseHtmlToBlocks($sectionHtml);
    expect(count($blocks))->toBe(4);

    // 3. Classify and verify individual heights of empty paragraphs
    $block1 = ReportPaginator::classifyBlock($blocks[0], 130); // <p>Texto 1</p>
    $block2 = ReportPaginator::classifyBlock($blocks[1], 130); // <p></p>
    $block3 = ReportPaginator::classifyBlock($blocks[2], 130); // <p><br></p>
    $block4 = ReportPaginator::classifyBlock($blocks[3], 130); // <p>Texto 2</p>

    expect($block1['type'])->toBe('paragraph');
    expect($block2['type'])->toBe('paragraph');
    expect($block3['type'])->toBe('paragraph');
    expect($block4['type'])->toBe('paragraph');

    // Each empty paragraph must have a height equivalent to at least 1 line (3.525mm)
    expect($block2['height'])->toBe(3.525);
    expect($block3['height'])->toBe(3.525);
});

test('report paginator splits ordered lists across pages preserving start index', function () {
    $listHtml = '<ol>'.
        '<li>Primer paso del procedimiento</li>'.
        '<li>Segundo paso del procedimiento</li>'.
        '<li>Tercer paso del procedimiento</li>'.
        '<li>Cuarto paso del procedimiento</li>'.
        '<li>Quinto paso del procedimiento</li>'.
        '<li>Sexto paso del procedimiento</li>'.
        '<li>Séptimo paso del procedimiento</li>'.
        '<li>Octavo paso del procedimiento</li>'.
        '<li>Noveno paso del procedimiento</li>'.
        '<li>Décimo paso del procedimiento</li>'.
        '<li>Undécimo paso del procedimiento</li>'.
        '<li>Duodécimo paso del procedimiento</li>'.
        '<li>Décimo tercer paso del procedimiento</li>'.
        '<li>Décimo cuarto paso del procedimiento</li>'.
        '<li>Décimo quinto paso del procedimiento</li>'.
        '</ol>';

    $blocks = [
        [
            'id' => 'ordered-list',
            'type' => 'list',
            'html' => $listHtml,
        ],
    ];

    // Page height of 30mm can fit ~7 list items (~25mm), forcing items 8+ to page 2 with start="8"
    $pages = ReportPaginator::paginateBlocks($blocks, 30.0, 3.53, 155);

    expect(count($pages))->toBe(3);

    // Page 2 should have <ol start="..."> with index > 1
    $page2List = array_filter($pages[1], fn ($b) => str_contains($b['html'] ?? '', '<ol'));
    expect($page2List)->not->toBeEmpty();

    $p2Html = reset($page2List)['html'];
    expect($p2Html)->toMatch('/<ol[^>]+start=["\']\d+["\']/');
});

test('report paginator enforces keep_together on signature blocks and creates dedicated overflow page', function () {
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-102-26';
    $specimen->diagnosis = 'Carcinoma ductal infiltrante';
    $specimen->anatomic_site = 'Mama derecha';
    $specimen->users = collect([
        (object) [
            'id' => 1,
            'name' => 'DRA. ESTEFANY LAGOS',
            'role' => (object) ['name' => 'PATOLOGÍA ONCOLÓGICA'],
        ],
        (object) [
            'id' => 2,
            'name' => 'DR. ROBERTO MEJÍA',
            'role' => (object) ['name' => 'PATOLOGÍA QUIRÚRGICA'],
        ],
    ]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'diagnosis_html', 'order' => 1, 'active' => true],
    ];

    // Make diagnosis take up almost entire Page 1 budget
    // Signature block for 2 pathologists takes 25mm.
    // ~105 repetitions gives ~50 lines (~175mm) + ~35mm patient card = ~210mm -> overflows diagnosis to page 2,
    // or ~80 repetitions gives ~38 lines (~135mm) + ~35mm patient card + ~8mm header = ~178mm, leaving 27mm,
    // which cannot fit 25mm + signature margin -> overflow signature to Page 2!
    $report->diagnosis_html = '<p>'.str_repeat('Diagnóstico extenso detallado con múltiples líneas de texto patológico de la biopsia. ', 100).'</p>';
    $report->clinical_details_html = '';
    $report->macroscopy_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Ana Castillo';
    $customer->age = 52;
    $customer->gender = 'F';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Mario Santos';
    $referrer->notes = 'Centro Médico';

    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);

    expect(count($pages))->toBe(2);

    // Page 2 should contain the signature block
    $page2Signature = array_filter($pages[1], fn ($b) => ($b['type'] ?? '') === 'signature');
    expect($page2Signature)->not->toBeEmpty();
});

test('report paginator respects headings_toggles visibility setting', function () {
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-103-26';
    $specimen->diagnosis = 'Hiperplasia';
    $specimen->anatomic_site = 'Endometrio';
    $specimen->users = collect([]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'clinical_details_html', 'order' => 1, 'active' => true],
        ['key' => 'diagnosis_html', 'order' => 2, 'active' => true],
    ];
    $report->clinical_details_html = '<p>Detalles clínicos presentes.</p>';
    $report->diagnosis_html = '<p>Diagnóstico de hiperplasia endometrial.</p>';
    $report->headings_toggles = [
        'clinical_details_html' => false, // Hidden
        'diagnosis_html' => true,         // Visible
    ];

    $customer = new stdClass;
    $customer->name = 'Laura Paz';
    $customer->age = 38;
    $customer->gender = 'F';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Juan Díaz';
    $referrer->notes = 'Clínica Ginecológica';

    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);

    expect(count($pages))->toBeGreaterThanOrEqual(1);

    // Should NOT have DATOS CLÍNICOS header because it was toggled false
    $clinHeaders = array_filter($pages[0], fn ($b) => ($b['type'] ?? '') === 'section-header' && ($b['title'] ?? '') === 'DATOS CLÍNICOS');
    expect($clinHeaders)->toBeEmpty();

    // SHOULD have DIAGNÓSTICO header because it was toggled true
    $diagHeaders = array_filter($pages[0], fn ($b) => ($b['type'] ?? '') === 'section-header' && ($b['title'] ?? '') === 'DIAGNÓSTICO');
    expect($diagHeaders)->not->toBeEmpty();
});

test('report paginator sorts image grid images by data-order attribute', function () {
    $gridHtml = '<div data-columns="3" data-align="center" data-type="image-grid" class="align-center" style="display: grid; margin-left: auto; margin-right: auto;">'
        .'<img src="http://localhost:8000/storage/img3.jpg" data-order="3" data-caption="Foto 3" style="display: block;">'
        .'<img src="http://localhost:8000/storage/img1.jpg" data-order="1" data-caption="Foto 1" style="display: block;">'
        .'<img src="http://localhost:8000/storage/img2.jpg" data-order="2" data-caption="Foto 2" style="display: block;">'
        .'</div>';

    $classified = ReportPaginator::classifyBlock($gridHtml, 144);

    expect($classified['type'])->toBe('image-grid');
    expect($classified['images'])->toHaveCount(3);
    expect($classified['images'][0])->toContain('img1.jpg');
    expect($classified['images'][1])->toContain('img2.jpg');
    expect($classified['images'][2])->toContain('img3.jpg');

    $pages = ReportPaginator::paginateBlocks([$classified], 210.0, 3.53, 144);
    expect($pages)->toHaveCount(1);

    $gridBlock = $pages[0][0];
    expect($gridBlock['type'])->toBe('html');
    $pos1 = strpos($gridBlock['html'], 'img1.jpg');
    $pos2 = strpos($gridBlock['html'], 'img2.jpg');
    $pos3 = strpos($gridBlock['html'], 'img3.jpg');

    expect($pos1)->toBeLessThan($pos2);
    expect($pos2)->toBeLessThan($pos3);
});

test('report paginator removes hyperlinks while preserving inner text and markup', function () {
    $htmlWithLinks = '<p>Visite nuestro <a href="https://patolab.org" target="_blank" style="color: blue;"><strong>portal web</strong></a> para más información o escriba a <a href="mailto:info@patolab.org">soporte</a>.</p>';

    $cleaned = ReportPaginator::removeHyperlinks($htmlWithLinks);

    expect($cleaned)->not->toContain('<a');
    expect($cleaned)->not->toContain('</a>');
    expect($cleaned)->not->toContain('href=');
    expect($cleaned)->toContain('<strong>portal web</strong>');
    expect($cleaned)->toContain('soporte');

    $blocks = ReportPaginator::parseHtmlToBlocks($htmlWithLinks);
    expect($blocks)->toHaveCount(1);
    expect($blocks[0])->not->toContain('<a');
    expect($blocks[0])->toContain('portal web');
});

test('report paginator calculates signature block height with increased row height (33.33mm)', function () {
    expect(ReportPaginator::SIGNATURE_ROW_HEIGHT)->toBe(33.33);

    $specimen = new stdClass;
    $specimen->sequence_code = 'B-200-26';
    $specimen->diagnosis = 'Biopsia gástrica';
    $specimen->anatomic_site = 'Estómago';
    $specimen->users = collect([
        (object) [
            'id' => 1,
            'name' => 'DRA. ESTEFANY LAGOS',
            'role' => (object) ['name' => 'PATOLOGÍA ONCOLÓGICA'],
        ],
    ]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'diagnosis_html', 'order' => 1, 'active' => true],
    ];
    $report->diagnosis_html = '<p>Diagnóstico breve.</p>';
    $report->clinical_details_html = '';
    $report->macroscopy_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Juan Pérez';
    $customer->age = 45;
    $customer->gender = 'M';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Gómez';
    $referrer->notes = 'Clínica Central';

    // Test 1 pathologist -> 1 row = 33.33mm
    $pages1 = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);
    $sigBlock1 = collect($pages1)->flatten(1)->firstWhere('type', 'signature');
    expect($sigBlock1)->not->toBeNull();
    expect($sigBlock1['height'])->toBe(33.33);

    // Test 3 pathologists -> 2 rows = 66.66mm
    $specimen->users->push(
        (object) ['id' => 2, 'name' => 'DR. ROBERTO MEJÍA', 'role' => (object) ['name' => 'PATOLOGÍA QUIRÚRGICA']],
        (object) ['id' => 3, 'name' => 'DRA. MARÍA LÓPEZ', 'role' => (object) ['name' => 'PATOLOGÍA CLÍNICA']]
    );
    $pages3 = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);
    $sigBlock3 = collect($pages3)->flatten(1)->firstWhere('type', 'signature');
    expect($sigBlock3)->not->toBeNull();
    expect($sigBlock3['height'])->toBe(66.66);
});

test('report paginator ensures page content height never exceeds 208.90mm to avoid footer overlap', function () {
    expect(ReportPaginator::PAGE_CONTENT_HEIGHT)->toBe(208.90);

    $specimen = new stdClass;
    $specimen->sequence_code = 'BIO-0099-08-2026';
    $specimen->diagnosis = 'Gastritis crónica moderada';
    $specimen->anatomic_site = 'Antro gástrico';
    $specimen->users = collect();

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'diagnosis_html', 'order' => 1, 'active' => true],
    ];

    // Build dense paragraphs replicating the example where content previously reached 212.42mm
    $para = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum in ultricies tellus, sed tempus quam. Nullam vulputate consectetur venenatis. Nulla tristique, nunc ac semper vehicula, ex nibh dictum massa, eget porttitor eros nisi sed ligula. Sed sagittis rhoncus nisl ac rutrum. Nullam vel turpis pharetra, convallis tortor quis, maximus urna. Nulla leo nulla, tincidunt sit amet ipsum a, eleifend ultrices odio. Integer elit elit, volutpat nec accumsan ac, ornare et ipsum. Sed volutpat egestas tincidunt. Cras augue libero, volutpat vitae leo eu, dapibus ultricies lorem. Aliquam id posuere lorem. In facilisis quam eget aliquam cursus.</p>';
    $denseHtml = str_repeat($para, 15);
    $report->diagnosis_html = $denseHtml;
    $report->clinical_details_html = '';
    $report->macroscopy_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Paciente Prueba';
    $customer->age = 50;
    $customer->gender = 'M';

    $referrer = new stdClass;
    $referrer->name = 'Dr. Referente';
    $referrer->notes = 'Clínica San Pedro';

    $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, false);

    expect(count($pages))->toBeGreaterThanOrEqual(2);

    // Assert every page's total accumulated block height is <= 208.90mm
    foreach ($pages as $pIdx => $pageBlocks) {
        $totalHeight = 0.0;
        foreach ($pageBlocks as $block) {
            $totalHeight += (float) $block['height'];
        }
        expect($totalHeight)->toBeLessThanOrEqual(208.90 + 0.001); // 0.001 delta for floating point precision
    }
});

test('report paginator paginateList does not duplicate nested list items with double or triple hierarchy', function () {
    $nestedListHtml = '<ul>'.
        '<li>Padre 1'.
            '<ul>'.
                '<li>Hijo nivel 2'.
                    '<ul>'.
                        '<li>Nieto nivel 3</li>'.
                    '</ul>'.
                '</li>'.
                '<li>Hijo nivel 2 hermano</li>'.
            '</ul>'.
        '</li>'.
        '<li>Padre 2</li>'.
    '</ul>';

    $result = ReportPaginator::paginateList($nestedListHtml);

    expect($result)->toBeArray();
    expect($result['tag'])->toBe('ul');
    // Must only have 2 top-level items, NOT 4 or 5 items with duplicates
    expect($result['items'])->toHaveCount(2);

    // Item 0 is Padre 1, containing the nested sub-list
    expect($result['items'][0]['html'])->toContain('Padre 1');
    expect($result['items'][0]['html'])->toContain('Hijo nivel 2');
    expect($result['items'][0]['html'])->toContain('Nieto nivel 3');

    // Item 1 is Padre 2
    expect($result['items'][1]['html'])->toContain('Padre 2');
    expect($result['items'][1]['html'])->not->toContain('Hijo nivel 2');

    // Height of Item 0 should account for all 4 lines (Padre 1 + Hijo nivel 2 + Nieto nivel 3 + Hijo nivel 2 hermano)
    expect($result['items'][0]['height'])->toBeGreaterThanOrEqual(4 * 3.53);
});

test('report paginator end-to-end pagination with nested list does not produce duplicate blocks', function () {
    $specimen = new stdClass;
    $specimen->sequence_code = 'BIO-1234-09-2026';
    $specimen->diagnosis = '';
    $specimen->anatomic_site = 'Piel';
    $specimen->users = collect();

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'diagnosis_html', 'order' => 1, 'active' => true],
    ];
    $report->diagnosis_html = '<ul>'.
        '<li>Diagnóstico principal'.
            '<ul>'.
                '<li>Subdiagnóstico A'.
                    '<ul>'.
                        '<li>Detalle triple</li>'.
                    '</ul>'.
                '</li>'.
            '</ul>'.
        '</li>'.
    '</ul>';
    $report->clinical_details_html = '';
    $report->macroscopy_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $pages = ReportPaginator::paginate($specimen, $report, null, null, false);

    expect($pages)->toBeArray();
    expect($pages)->not->toBeEmpty();

    $listBlocks = collect($pages[0])->filter(fn ($b) => ($b['type'] ?? '') === 'html' && str_contains($b['html'] ?? '', 'Diagnóstico principal'));
    expect($listBlocks)->toHaveCount(1);

    $html = $listBlocks->first()['html'];
    // "Subdiagnóstico A" must appear exactly once in the rendered HTML, never duplicated
    expect(substr_count($html, 'Subdiagnóstico A'))->toBe(1);
    // "Detalle triple" must appear exactly once, never triplicated
    expect(substr_count($html, 'Detalle triple'))->toBe(1);
});

test('report paginator calculates dynamic signature height for multi-line signature subtext', function () {
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-300-26';
    $specimen->diagnosis = 'Biopsia';
    $specimen->anatomic_site = 'Piel';
    $specimen->users = collect([
        (object) [
            'id' => 1,
            'name' => 'DRA. ANA RAQUEL URBINA',
            'signature_subtext' => "ANATOMÍA PATOLÓGICA\nMSC. PATOLOGÍA ONCOLÓGICA",
            'role' => (object) ['name' => 'PATÓLOGO'],
        ],
    ]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'diagnosis_html', 'order' => 1, 'active' => true],
    ];
    $report->diagnosis_html = '<p>Diagnóstico.</p>';
    $report->clinical_details_html = '';
    $report->macroscopy_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'María';
    $customer->age = 30;
    $customer->gender = 'F';

    // 1 pathologist with 2 lines -> 1 extra line -> 33.33 + 3.0 = 36.33mm
    $pages = ReportPaginator::paginate($specimen, $report, $customer, null, false);
    $sigBlock = collect($pages)->flatten(1)->firstWhere('type', 'signature');
    expect($sigBlock)->not->toBeNull();
    expect($sigBlock['height'])->toBe(36.33);

    // 2 pathologists in 1 row: one has 2 lines (1 extra), one has 3 lines (2 extra) -> maxExtraLines = 2 -> 33.33 + (2 * 3.0) = 39.33mm
    $specimen->users->push(
        (object) [
            'id' => 2,
            'name' => 'DRA. ESTEFANY LAGOS',
            'signature_subtext' => "ANATOMÍA PATOLÓGICA\nMSC. PATOLOGÍA ONCOLÓGICA\nESPECIALISTA",
            'role' => (object) ['name' => 'PATÓLOGO'],
        ]
    );
    $pages2 = ReportPaginator::paginate($specimen, $report, $customer, null, false);
    $sigBlock2 = collect($pages2)->flatten(1)->firstWhere('type', 'signature');
    expect($sigBlock2)->not->toBeNull();
    expect($sigBlock2['height'])->toBe(39.33);
});

test('report paginator does not fallback to specimen diagnosis when diagnosis_html is empty', function () {
    $specimen = new stdClass;
    $specimen->sequence_code = 'B-103-26';
    $specimen->diagnosis = 'Duodenopatía Exudativa';
    $specimen->anatomic_site = 'Duodeno';
    $specimen->users = collect([]);

    $report = new stdClass;
    $report->sections_order = [
        ['key' => 'diagnosis_html', 'order' => 1, 'active' => true],
        ['key' => 'macroscopy_html', 'order' => 2, 'active' => true],
    ];
    $report->diagnosis_html = '';
    $report->macroscopy_html = '<p>Descripción macroscópica válida.</p>';
    $report->clinical_details_html = '';
    $report->microscopy_html = '';
    $report->comments_notes_html = '';
    $report->protocols_html = '';
    $report->legend_html = '';

    $customer = new stdClass;
    $customer->name = 'Yeni Patricia';
    $customer->age = 34;
    $customer->gender = 'F';

    $pages = ReportPaginator::paginate($specimen, $report, $customer, null, false);
    $allBlocks = collect($pages)->flatten(1);

    // Section header for DIAGNÓSTICO must NOT be present
    $diagHeaders = $allBlocks->filter(fn ($b) => ($b['type'] ?? '') === 'section-header' && ($b['title'] ?? '') === 'DIAGNÓSTICO');
    expect($diagHeaders)->toBeEmpty();

    // Body content with specimen diagnosis must NOT be present in body blocks
    $diagBodyBlocks = $allBlocks->filter(fn ($b) => ($b['type'] ?? '') === 'paragraph' && str_contains($b['html'] ?? '', 'Duodenopatía Exudativa'));
    expect($diagBodyBlocks)->toBeEmpty();

    // Macroscopy header and content must still be present
    $macroHeaders = $allBlocks->filter(fn ($b) => ($b['type'] ?? '') === 'section-header' && ($b['title'] ?? '') === 'DESCRIPCIÓN MACROSCÓPICA');
    expect($macroHeaders)->not->toBeEmpty();
});
