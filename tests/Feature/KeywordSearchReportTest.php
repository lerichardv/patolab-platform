<?php

use App\Http\Controllers\Reports\KeywordSearchReportController;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->role = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $this->viewPermission = Permission::create(['slug' => 'reports.keywords.view', 'name' => 'Ver Reporte de Palabras Clave']);
    $this->role->permissions()->attach($this->viewPermission);

    $this->user = User::factory()->create([
        'name' => 'Dra. Ana Raquel Urbina',
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $this->unauthorizedUser = User::factory()->create([
        'name' => 'Usuario No Autorizado',
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create([
        'name' => 'Juan Carlos López Ramírez',
        'id_number' => '0501197600123',
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia Colon',
        'active' => true,
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Resección Intestinal (Sigmoide)',
        'code' => 'COL-01',
        'description' => 'Estudio de colon',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Biopsia',
        'quantity' => 1,
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Hospital']);
    $this->referrer = Referrer::create([
        'name' => 'Hospital D’Antoni',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#10b981',
        'order' => 1,
        'active' => true,
    ]);

    $this->report = SpecimenReport::create([
        'report_code' => 'REP-001-2026',
        'report_date' => now()->toDateString(),
        'microscopy_html' => '<p>Los márgenes quirúrgicos se encuentran libres de neoplasia maligna.</p>',
        'macroscopy_html' => '<p>Se recibe segmento intestinal con lesión ulcerada.</p>',
        'diagnosis_html' => '<p>Adenocarcinoma de colon bien diferenciado.</p>',
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BX-5345-09-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'report_id' => $this->report->id,
        'anatomic_site' => 'Colon Sigmoide',
        'diagnosis' => 'Adenocarcinoma',
        'status' => 'finalized',
    ]);

    $this->specimen->users()->attach($this->user->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);
});

test('unauthorized user cannot access keyword search report or stream', function () {
    $this->actingAs($this->unauthorizedUser)
        ->get(route('reports.keywords.index'))
        ->assertForbidden();

    $this->actingAs($this->unauthorizedUser)
        ->get(route('reports.keywords.stream'))
        ->assertForbidden();

    $this->actingAs($this->unauthorizedUser)
        ->get(route('reports.keywords.export'))
        ->assertForbidden();
});

test('authorized user can view keyword search report page with catalogs', function () {
    $response = $this->actingAs($this->user)->get(route('reports.keywords.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/keywords/index')
        ->has('specimenTypes')
        ->has('examinations')
        ->has('pathologists')
        ->has('filters')
    );
});

test('stream returns matching specimen when keyword matches report microscopy_html', function () {
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->toContain('"type":"result"')
        ->and($content)->toContain('BX-5345-09-2026')
        ->and($content)->toContain('márgenes')
        ->and($content)->toContain('Microscopía')
        ->and($content)->toContain('"type":"done"');
});

test('stream returns matching specimen when keyword matches customer name', function () {
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'Juan Carlos',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->toContain('"type":"result"')
        ->and($content)->toContain('Juan Carlos López Ramírez')
        ->and($content)->toContain('"type":"done"');
});

test('stream filters by specimen type', function () {
    $otherType = SpecimenType::create(['name' => 'Citología', 'active' => true]);

    // Matching type
    $responseMatching = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes',
        'specimen_type_id' => (string) $this->specimenType->id,
    ]));

    expect($responseMatching->streamedContent())->toContain('BX-5345-09-2026');

    // Matching type as array
    $responseMatchingArray = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes',
        'specimen_type_id' => [(string) $this->specimenType->id],
    ]));

    expect($responseMatchingArray->streamedContent())->toContain('BX-5345-09-2026');

    // When specimen_type_id is none
    $responseNone = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes',
        'specimen_type_id' => 'none',
    ]));

    expect($responseNone->streamedContent())->not->toContain('BX-5345-09-2026');

    // Non-matching type
    $responseNonMatching = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes',
        'specimen_type_id' => (string) $otherType->id,
    ]));

    expect($responseNonMatching->streamedContent())->not->toContain('BX-5345-09-2026');
});

test('authorized user can export keyword search results to excel', function () {
    $response = $this->actingAs($this->user)->get(route('reports.keywords.export', [
        'search' => 'márgenes',
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('preview pdf returns inline pdf file when report file exists', function () {
    Storage::fake('public');
    $pdfPath = 'reports/test_report.pdf';
    Storage::disk('public')->put($pdfPath, '%PDF-1.4 test dummy pdf content');

    $this->report->update(['report_file' => $pdfPath]);

    $response = $this->actingAs($this->user)->get(route('reports.keywords.preview-pdf', [
        'specimen' => $this->specimen->sequence_code,
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
    expect($response->headers->get('Content-Disposition'))->toContain('inline');
});

test('stream filters by examination id', function () {
    $otherExam = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Endoscópica',
        'code' => 'COL-02',
        'active' => true,
    ]);

    $matchingResponse = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'examination_id' => (string) $this->examination->id,
    ]));

    expect($matchingResponse->streamedContent())->toContain('BX-5345-09-2026');

    $nonMatchingResponse = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'examination_id' => (string) $otherExam->id,
    ]));

    expect($nonMatchingResponse->streamedContent())->not->toContain('BX-5345-09-2026');
});

test('stream filters by pathologist id', function () {
    $otherUser = User::factory()->create([
        'name' => 'Dr. Otro Patólogo',
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $matchingResponse = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'pathologist_id' => (string) $this->user->id,
    ]));

    expect($matchingResponse->streamedContent())->toContain('BX-5345-09-2026');

    $nonMatchingResponse = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'pathologist_id' => (string) $otherUser->id,
    ]));

    expect($nonMatchingResponse->streamedContent())->not->toContain('BX-5345-09-2026');
});

test('preview data returns has_pdf false and specimen report data when report file is missing', function () {
    $this->report->update(['report_file' => null]);

    $response = $this->actingAs($this->user)->get(route('reports.keywords.preview-data', [
        'specimen' => $this->specimen->sequence_code,
    ]));

    $response->assertStatus(200);
    $response->assertJson([
        'has_pdf' => false,
        'pdf_url' => null,
    ]);

    expect($response->json('specimen.sequence_code'))->toBe($this->specimen->sequence_code)
        ->and($response->json('specimen.report.diagnosis_html'))->toContain('Adenocarcinoma');
});

test('preview data returns has_pdf true and pdf_url when report file exists', function () {
    Storage::fake('public');
    $pdfPath = 'reports/test_report.pdf';
    Storage::disk('public')->put($pdfPath, '%PDF-1.4 test dummy pdf content');

    $this->report->update(['report_file' => $pdfPath]);

    $response = $this->actingAs($this->user)->get(route('reports.keywords.preview-data', [
        'specimen' => $this->specimen->sequence_code,
    ]));

    $response->assertStatus(200);
    $response->assertJson([
        'has_pdf' => true,
    ]);

    expect($response->json('pdf_url'))->not->toBeNull();
});

test('parseSearchTerms correctly splits words and preserves quoted phrases', function () {
    expect(KeywordSearchReportController::parseSearchTerms('márgenes libres'))
        ->toBe(['márgenes', 'libres']);

    expect(KeywordSearchReportController::parseSearchTerms('márgenes, libres; neoplasia'))
        ->toBe(['márgenes', 'libres', 'neoplasia']);

    expect(KeywordSearchReportController::parseSearchTerms('"márgenes quirúrgicos" neoplasia'))
        ->toBe(['márgenes quirúrgicos', 'neoplasia']);

    expect(KeywordSearchReportController::parseSearchTerms('   '))
        ->toBe([]);
});

test('stream returns matching specimen when non-consecutive words are passed in the same field', function () {
    // Report has: '<p>Los márgenes quirúrgicos se encuentran libres de neoplasia maligna.</p>'
    // Search words: 'márgenes neoplasia' (separated by 5 words)
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes neoplasia',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->toContain('"type":"result"')
        ->and($content)->toContain('BX-5345-09-2026')
        ->and($content)->toContain('márgenes')
        ->and($content)->toContain('neoplasia')
        ->and($content)->toContain('Microscopía')
        ->and($content)->toContain('"type":"done"');
});

test('stream returns matching specimen when search words are in reverse order of the report text', function () {
    // Search words in reverse order: 'maligna márgenes'
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'maligna márgenes',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->toContain('"type":"result"')
        ->and($content)->toContain('BX-5345-09-2026')
        ->and($content)->toContain('"type":"done"');
});

test('stream returns matching specimen when search words match across different fields', function () {
    // 'Adenocarcinoma' is in report diagnosis_html, 'Sigmoide' is in specimen anatomic_site
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'Adenocarcinoma Sigmoide',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->toContain('"type":"result"')
        ->and($content)->toContain('BX-5345-09-2026')
        ->and($content)->toContain('"type":"done"');
});

test('stream matches keywords with or without accents', function () {
    // 'margenes' without accent matching 'márgenes'
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'margenes neoplasia',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->toContain('"type":"result"')
        ->and($content)->toContain('BX-5345-09-2026')
        ->and($content)->toContain('"type":"done"');
});

test('stream excludes specimen when at least one searched word does not match', function () {
    // 'márgenes' exists, but 'melanoma' does NOT exist anywhere in this specimen
    $response = $this->actingAs($this->user)->get(route('reports.keywords.stream', [
        'search' => 'márgenes melanoma',
    ]));

    $response->assertStatus(200);
    $content = $response->streamedContent();

    expect($content)->not->toContain('BX-5345-09-2026')
        ->and($content)->toContain('"total":0');
});

test('export works with non-consecutive multi-word keyword search', function () {
    $response = $this->actingAs($this->user)->get(route('reports.keywords.export', [
        'search' => 'márgenes neoplasia',
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});
