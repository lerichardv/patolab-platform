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
use App\Models\SpecimenTypeTemplate;
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

    $this->assignedUser = User::factory()->create();

    $this->specimen->users()->attach($this->assignedUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);
});

test('applying template preserves existing galleries and photo order in the report', function () {
    $this->actingAs($this->assignedUser);

    $galleryHtml = '<div data-type="image-grid" data-columns="2" data-align="center" class="align-center" style="display: grid; margin-left: auto; margin-right: auto;"><img src="/storage/specimens/1/photo_1.jpg" data-order="1" data-caption="Foto 1"><img src="/storage/specimens/1/photo_2.jpg" data-order="2" data-caption="Foto 2"></div>';

    $report = SpecimenReport::create([
        'specimen_id' => $this->specimen->id,
        'report_date' => '2026-10-05',
        'macroscopy_html' => $galleryHtml,
        'microscopy_html' => '<p>Microscopía existente previa</p>',
        'diagnosis_html' => '<p>Diagnóstico previo</p>',
    ]);

    $this->specimen->update(['report_id' => $report->id]);

    $template = SpecimenTypeTemplate::create([
        'name' => 'Plantilla Biopsia Vesícula',
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'user_id' => $this->assignedUser->id,
        'macroscopy_html' => '<p>Se recibe vesícula biliar intacta.</p>',
        'microscopy_html' => '<p>Los cortes muestran mucosa biliar con infiltrado.</p>',
        'diagnosis_html' => '<p>Colecistitis crónica litiásica.</p>',
        'addendum_html' => null,
    ]);

    $response = $this->postJson(route('specimens.report-editor.apply-template', $this->specimen->sequence_code), [
        'template_id' => $template->id,
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
        ]);

    $this->specimen->refresh();
    $macro = $this->specimen->report->macroscopy_html;

    // Verify template content was prepended
    expect($macro)->toContain('<p>Se recibe vesícula biliar intacta.</p>');

    // Verify existing gallery container was preserved
    expect($macro)->toContain('data-type="image-grid"')
        ->and($macro)->toContain('data-columns="2"')
        ->and($macro)->toContain('data-align="center"');

    // Verify photos and data-order were preserved
    expect($macro)->toContain('data-order="1"')
        ->and($macro)->toContain('data-caption="Foto 1"')
        ->and($macro)->toContain('data-order="2"')
        ->and($macro)->toContain('data-caption="Foto 2"');

    // Verify photo 1 appears before photo 2
    $pos1 = strpos($macro, 'data-order="1"');
    $pos2 = strpos($macro, 'data-order="2"');
    expect($pos1)->toBeLessThan($pos2);
});

test('applying template with empty fields does not clear existing report fields or galleries', function () {
    $this->actingAs($this->assignedUser);

    $galleryHtml = '<div data-type="image-grid" data-columns="2" data-align="center"><img src="/storage/specimens/1/photo_1.jpg" data-order="1"><img src="/storage/specimens/1/photo_2.jpg" data-order="2"></div>';

    $report = SpecimenReport::create([
        'specimen_id' => $this->specimen->id,
        'report_date' => '2026-10-05',
        'macroscopy_html' => $galleryHtml,
        'microscopy_html' => '<p>Microscopía intacta</p>',
        'diagnosis_html' => '<p>Diagnóstico previo</p>',
    ]);

    $this->specimen->update(['report_id' => $report->id]);

    // Template defines only diagnosis, macroscopy is empty
    $template = SpecimenTypeTemplate::create([
        'name' => 'Plantilla Solo Diagnóstico',
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'user_id' => $this->assignedUser->id,
        'macroscopy_html' => '',
        'microscopy_html' => '',
        'diagnosis_html' => '<p>Nuevo diagnóstico</p>',
        'addendum_html' => null,
    ]);

    $response = $this->postJson(route('specimens.report-editor.apply-template', $this->specimen->sequence_code), [
        'template_id' => $template->id,
    ]);

    $response->assertOk();

    $this->specimen->refresh();

    // Macroscopy gallery is completely untouched
    expect($this->specimen->report->macroscopy_html)->toBe($galleryHtml);
    expect($this->specimen->report->microscopy_html)->toBe('<p>Microscopía intacta</p>');
    expect($this->specimen->report->diagnosis_html)->toContain('<p>Nuevo diagnóstico</p>');
});
