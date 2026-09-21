<?php

use App\Services\DeliveryNotePaginator;

test('it paginates empty content and appends signatures block', function () {
    $pages = DeliveryNotePaginator::paginate('');

    expect($pages)->toBeArray();
    expect($pages)->toHaveCount(1);
    expect($pages[0])->toHaveCount(1);
    expect($pages[0][0]['type'])->toBe('signatures');
    expect($pages[0][0]['height'])->toBe(DeliveryNotePaginator::SIGNATURES_HEIGHT);
});

test('it paginates short content within a single page alongside signatures', function () {
    $html = '<h2>NOTA DE ENTREGA</h2><p>Entregado a Juan Pérez con DNI 123456.</p><p>Material entregado en perfecto estado.</p>';

    $pages = DeliveryNotePaginator::paginate($html);

    expect($pages)->toHaveCount(1);
    expect(count($pages[0]))->toBeGreaterThanOrEqual(2);

    $lastBlock = end($pages[0]);
    expect($lastBlock['type'])->toBe('signatures');
});

test('it pushes signatures block to a new page when first page content fills available height', function () {
    // Generate enough paragraphs to almost fill or fill the page height (208.0mm)
    // Each paragraph with ~10 lines takes ~35mm. 6 of these take ~210mm.
    $longParagraph = '<p>'.str_repeat('Esta es una descripción detallada de los bloques de parafina entregados al cliente. ', 15).'</p>';
    $html = str_repeat($longParagraph, 6);

    $pages = DeliveryNotePaginator::paginate($html);

    expect(count($pages))->toBeGreaterThanOrEqual(2);

    // The signatures block must always be on the final page
    $lastPage = end($pages);
    $lastBlock = end($lastPage);
    expect($lastBlock['type'])->toBe('signatures');
});

test('it splits tables that exceed page height budget', function () {
    $rows = '';
    for ($i = 1; $i <= 30; $i++) {
        $rows .= "<tr><td>Item {$i}</td><td>Descripción de prueba para el ítem {$i} de la orden de trabajo</td><td>1</td></tr>";
    }
    $tableHtml = "<table><thead><tr><th>Ítem</th><th>Descripción</th><th>Cantidad</th></tr></thead><tbody>{$rows}</tbody></table>";

    $pages = DeliveryNotePaginator::paginate($tableHtml);

    expect(count($pages))->toBeGreaterThanOrEqual(2);

    $lastPage = end($pages);
    $lastBlock = end($lastPage);
    expect($lastBlock['type'])->toBe('signatures');
});

test('it parses and classifies HTML blocks with accurate heights', function () {
    $rawBlocks = DeliveryNotePaginator::parseHtmlToBlocks('<h3>Detalle</h3><ul><li>Elemento 1</li><li>Elemento 2</li></ul>');

    expect($rawBlocks)->toHaveCount(2);

    $classifiedHeading = DeliveryNotePaginator::classifyBlock($rawBlocks[0], 144);
    expect($classifiedHeading['type'])->toBe('heading');
    expect($classifiedHeading['tag'])->toBe('h3');
    expect($classifiedHeading['height'])->toBeGreaterThan(0);

    $classifiedList = DeliveryNotePaginator::classifyBlock($rawBlocks[1], 144);
    expect($classifiedList['type'])->toBe('list');
    expect($classifiedList['tag'])->toBe('ul');
});

test('it paginates and packages image grid into flex containers', function () {
    $gridHtml = '<div data-columns="2" data-align="center" width="370" data-type="image-grid" class="align-center" style="display: grid; margin-left: auto; margin-right: auto; width: 370px;"><img src="http://localhost:8000/storage/img1.jpg" data-align="center" class="align-center" style="display: block; margin-left: auto; margin-right: auto;"><img src="http://localhost:8000/storage/img2.jpg" data-align="center" class="align-center" style="display: block; margin-left: auto; margin-right: auto;"></div>';

    $pages = DeliveryNotePaginator::paginate($gridHtml);

    expect($pages)->toHaveCount(1);
    $firstPage = $pages[0];

    $gridBlock = collect($firstPage)->firstWhere('type', 'image-grid');
    expect($gridBlock)->not->toBeNull();
    expect($gridBlock['html'])->toContain('display: flex');
    expect($gridBlock['html'])->toContain('flex-wrap: nowrap');
    expect($gridBlock['html'])->toContain('grid-image-container');
    expect($gridBlock['html'])->toContain('img1.jpg');
    expect($gridBlock['html'])->toContain('img2.jpg');
});

test('it preserves and renders bullet lists and ordered lists without dropping them', function () {
    $html = <<<'HTML'
<p>DIAGNÓSTICO:</p>
<ul data-list-style-type="disc" style="list-style-type: disc;">
    <li><p>TIROIDES - TIROIDECTOMÍA TOTAL:</p></li>
    <li><p>CARCINOMA PAPILAR, SUBTIPO FOLICULAR INFILTRANTE, LIMITADO A LA TIROIDES.</p></li>
    <li><p>INVASION LINFOVASCULAR NO IDENTIFICADA.</p></li>
    <li><p>ADENOMA FOLICULAR EN EL LÓBULO DERECHO.</p></li>
    <li><p>TIROIDITIS DE HASHIMOTO.</p></li>
    <li><p>MARGENES DE RESECCION LIBRES DE NEOPLASIA.</p></li>
</ul>
<p>Fin del reporte</p>
HTML;

    $pages = DeliveryNotePaginator::paginate($html);

    expect($pages)->toBeArray();
    expect($pages)->not->toBeEmpty();

    $firstPage = $pages[0];
    $listBlock = collect($firstPage)->firstWhere('type', 'list');

    expect($listBlock)->not->toBeNull();
    expect($listBlock['html'])->toContain('data-list-style-type="disc"');
    expect($listBlock['html'])->toContain('TIROIDES - TIROIDECTOMÍA TOTAL:');
    expect($listBlock['html'])->toContain('TIROIDITIS DE HASHIMOTO.');
    expect($listBlock['html'])->toContain('MARGENES DE RESECCION LIBRES DE NEOPLASIA.');
});

test('it sorts image grid images by data-order attribute', function () {
    $gridHtml = '<div data-columns="2" data-align="center" data-type="image-grid" class="align-center" style="display: grid; margin-left: auto; margin-right: auto;">'
        .'<img src="http://localhost:8000/storage/beta.jpg" data-order="2" style="display: block;">'
        .'<img src="http://localhost:8000/storage/alpha.jpg" data-order="1" style="display: block;">'
        .'</div>';

    $pages = DeliveryNotePaginator::paginate($gridHtml);

    expect($pages)->toHaveCount(1);
    $firstPage = $pages[0];

    $gridBlock = collect($firstPage)->firstWhere('type', 'image-grid');
    expect($gridBlock)->not->toBeNull();

    $posAlpha = strpos($gridBlock['html'], 'alpha.jpg');
    $posBeta = strpos($gridBlock['html'], 'beta.jpg');

    expect($posAlpha)->toBeLessThan($posBeta);
});

test('it removes hyperlinks while preserving inner text and markup', function () {
    $htmlWithLinks = '<div><p>Nota con enlace: <a href="https://example.com" target="_blank"><em>Documento</em></a></p></div>';

    $cleaned = DeliveryNotePaginator::removeHyperlinks($htmlWithLinks);

    expect($cleaned)->not->toContain('<a');
    expect($cleaned)->not->toContain('</a>');
    expect($cleaned)->not->toContain('href=');
    expect($cleaned)->toContain('<em>Documento</em>');

    $pages = DeliveryNotePaginator::paginate($htmlWithLinks);
    $firstBlock = $pages[0][0];
    expect($firstBlock['html'])->not->toContain('<a');
    expect($firstBlock['html'])->toContain('Documento');
});
