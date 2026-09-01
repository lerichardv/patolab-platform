<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
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
    $this->collaboratorUser = User::factory()->create();
    $this->unassignedUser = User::factory()->create();

    // Assign the pathologist (user)
    $this->specimen->users()->attach($this->assignedUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    // Assign the collaborator
    $this->specimen->collaborators()->attach($this->collaboratorUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => false,
    ]);
});

test('assigned user can access the report editor page', function () {
    $this->actingAs($this->assignedUser);

    $response = $this->get(route('specimens.report-editor', $this->specimen->sequence_code));

    $response->assertStatus(200);
});

test('collaborator user can access the report editor page', function () {
    $this->actingAs($this->collaboratorUser);

    $response = $this->get(route('specimens.report-editor', $this->specimen->sequence_code));

    $response->assertStatus(200);
});

test('unassigned user can access the report editor page in read-only mode', function () {
    $this->actingAs($this->unassignedUser);

    $response = $this->get(route('specimens.report-editor', $this->specimen->sequence_code));

    $response->assertStatus(200);
});

test('unassigned user is forbidden from creating/storing a report', function () {
    $this->actingAs($this->unassignedUser);

    $response = $this->post(route('specimens.report-editor.store', $this->specimen->sequence_code), [
        'template_id' => null,
    ]);

    $response->assertStatus(403);
});

test('assigned user can create a report with multiple templates in ordered concatenation', function () {
    $this->actingAs($this->assignedUser);

    $exam2 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Inmunohistoquímica',
        'code' => 'IHQ',
    ]);

    $this->specimen->examinations()->attach([$this->examination->id, $exam2->id]);

    $template1 = SpecimenTypeTemplate::create([
        'name' => 'Plantilla Examen 1',
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'user_id' => $this->assignedUser->id,
        'macroscopy_html' => '<p>Macroscopía 1</p>',
        'microscopy_html' => '<p>Microscopía 1</p>',
        'diagnosis_html' => '<p>Diagnóstico 1</p>',
        'addendum_html' => '<p>Addendum 1</p>',
    ]);

    $template2 = SpecimenTypeTemplate::create([
        'name' => 'Plantilla Examen 2',
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $exam2->id,
        'user_id' => $this->assignedUser->id,
        'macroscopy_html' => '<p>Macroscopía 2</p>',
        'microscopy_html' => '<p>Microscopía 2</p>',
        'diagnosis_html' => '<p>Diagnóstico 2</p>',
        'addendum_html' => '<p>Addendum 2</p>',
    ]);

    $response = $this->post(route('specimens.report-editor.store', $this->specimen->sequence_code), [
        'template_ids' => [$template1->id, $template2->id],
    ]);

    $response->assertRedirect();

    $this->specimen->refresh();
    expect($this->specimen->status)->toBe('macroscopic_review')
        ->and($this->specimen->report)->not->toBeNull()
        ->and($this->specimen->report->macroscopy_html)->toBe('<p>Macroscopía 1</p><p>Macroscopía 2</p>')
        ->and($this->specimen->report->microscopy_html)->toBe('<p>Microscopía 1</p><p>Microscopía 2</p>')
        ->and($this->specimen->report->diagnosis_html)->toBe('<p>Diagnóstico 1</p><p>Diagnóstico 2</p>')
        ->and($this->specimen->report->addendum_html)->toBe('<p>Addendum 1</p><p>Addendum 2</p>');
});

test('creating a report via Inertia request returns redirect and does not return plain JSON', function () {
    $this->actingAs($this->assignedUser);

    $response = $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
    ])->post(route('specimens.report-editor.store', $this->specimen->sequence_code), []);

    $response->assertRedirect();
});

test('applying template with aligned table cells preserves table structure and alignment', function () {
    $this->actingAs($this->assignedUser);

    // Initialize report
    $this->post(route('specimens.report-editor.store', $this->specimen->sequence_code), []);
    $this->specimen->refresh();

    $tableHtml = '<table><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th style="text-align: center;"><p style="text-align: center;">Encabezado 1</p></th><th style="text-align: right;"><p style="text-align: right;">Encabezado 2</p></th></tr><tr><td style="text-align: center;"><p style="text-align: center;">Dato 1</p></td><td style="text-align: right;"><p style="text-align: right;">100.00</p></td></tr></tbody></table>';

    $template = SpecimenTypeTemplate::create([
        'name' => 'Plantilla con Tabla Alineada',
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'user_id' => $this->assignedUser->id,
        'macroscopy_html' => '<p>Macroscopía</p>',
        'microscopy_html' => '<p>Microscopía</p>',
        'diagnosis_html' => $tableHtml,
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
    expect($this->specimen->report->diagnosis_html)->toContain('text-align: center')
        ->and($this->specimen->report->diagnosis_html)->toContain('text-align: right')
        ->and($this->specimen->report->diagnosis_html)->toContain('Encabezado 1')
        ->and($this->specimen->report->diagnosis_html)->toContain('100.00');
});

test('applying template auto-creates report row if specimen has no report yet', function () {
    $this->actingAs($this->assignedUser);

    // Specimen has no report initially
    expect($this->specimen->report)->toBeNull()
        ->and($this->specimen->report_id)->toBeNull();

    $template = SpecimenTypeTemplate::create([
        'name' => 'Plantilla Inicial',
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'user_id' => $this->assignedUser->id,
        'macroscopy_html' => '<p>Macroscopía Inicial</p>',
        'microscopy_html' => '<p>Microscopía Inicial</p>',
        'diagnosis_html' => '<p>Diagnóstico Inicial</p>',
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
    expect($this->specimen->report_id)->not->toBeNull()
        ->and($this->specimen->report)->not->toBeNull()
        ->and($this->specimen->status)->toBe('macroscopic_review')
        ->and($this->specimen->report->diagnosis_html)->toBe('<p>Diagnóstico Inicial</p>');
});

test('saving report editor auto-creates report row if specimen has no report yet', function () {
    $this->actingAs($this->assignedUser);

    // Specimen has no report initially
    expect($this->specimen->report)->toBeNull()
        ->and($this->specimen->report_id)->toBeNull();

    $response = $this->postJson(route('specimens.report-editor.save', $this->specimen->sequence_code), [
        'diagnosis_html' => '<p>Diagnóstico Directo</p>',
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
        ]);

    $this->specimen->refresh();
    expect($this->specimen->report_id)->not->toBeNull()
        ->and($this->specimen->report)->not->toBeNull()
        ->and($this->specimen->status)->toBe('macroscopic_review')
        ->and($this->specimen->report->diagnosis_html)->toBe('<p>Diagnóstico Directo</p>');
});
