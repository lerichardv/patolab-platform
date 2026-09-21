<?php

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
use App\Services\ResendService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    Permission::create(['slug' => 'specimens.view', 'name' => 'Ver Muestras']);
    Permission::create(['slug' => 'specimens.edit', 'name' => 'Editar Muestras']);

    $this->customer = Customer::create([
        'name' => 'Juan Pérez',
        'email' => 'juan.perez@example.com',
        'id_number' => '0801199012345',
        'phone' => '99887766',
        'age' => 40,
        'gender' => 'male',
        'type' => 'cliente',
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Médico']);
    $this->referrer = Referrer::create([
        'name' => 'Dr. Roberto Gómez',
        'email' => 'dr.gomez@example.com',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'requires_report' => true,
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Gástrica',
        'code' => 'BG',
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Categoría General',
        'quantity' => 1,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#10b981',
        'order' => 1,
        'active' => true,
    ]);
});

test('reportEmailData returns specimen information and suggested emails', function () {
    Storage::fake('public');

    $report = SpecimenReport::create([
        'report_file' => 'reports/test_specimen.pdf',
        'report_date' => now()->toDateString(),
    ]);
    Storage::disk('public')->put('reports/test_specimen.pdf', 'Dummy PDF');

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0010-09-2026',
        'customer' => $this->customer->id,
        'referrer' => $this->referrer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'priority_id' => $this->priority->id,
        'status' => 'finalized',
        'report_id' => $report->id,
        'access_token' => 'token-123',
        'delivery_token' => 'deliv-123',
    ]);

    $response = $this->actingAs($this->user)->getJson(route('specimens.report-email-data', $specimen));

    $response->assertOk();
    $response->assertJsonStructure([
        'specimen' => [
            'id',
            'sequence_code',
            'status',
            'customer_name',
            'customer_email',
            'referrer_name',
            'referrer_email',
            'examination_name',
            'type_name',
            'requires_report',
            'has_report_file',
            'report_file_name',
            'report_file_url',
        ],
        'default_subject',
        'suggested_emails',
    ]);

    $data = $response->json();
    expect($data['specimen']['sequence_code'])->toBe('BIO-0010-09-2026');
    expect($data['specimen']['customer_email'])->toBe('juan.perez@example.com');
    expect($data['specimen']['referrer_email'])->toBe('dr.gomez@example.com');
    expect($data['specimen']['has_report_file'])->toBeTrue();
    expect($data['specimen']['report_file_url'])->not->toBeEmpty();
    expect($data['suggested_emails'])->toHaveCount(2);
});

test('sendReport fails with 422 if specimen status is not finalized or delivered', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0011-09-2026',
        'customer' => $this->customer->id,
        'referrer' => $this->referrer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'priority_id' => $this->priority->id,
        'status' => 'processing',
        'access_token' => 'token-123',
    ]);

    $response = $this->actingAs($this->user)->postJson(route('specimens.send-report', $specimen), [
        'emails' => ['doctor@example.com'],
    ]);

    $response->assertStatus(422);
    $response->assertJson([
        'message' => 'El reporte solo puede enviarse cuando la muestra esté finalizada o entregada.',
    ]);
});

test('sendReport validates that emails array is required and valid', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0012-09-2026',
        'customer' => $this->customer->id,
        'referrer' => $this->referrer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'priority_id' => $this->priority->id,
        'status' => 'finalized',
        'access_token' => 'token-123',
    ]);

    $response = $this->actingAs($this->user)->postJson(route('specimens.send-report', $specimen), [
        'emails' => [],
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['emails']);

    $responseInvalid = $this->actingAs($this->user)->postJson(route('specimens.send-report', $specimen), [
        'emails' => ['not-an-email'],
    ]);

    $responseInvalid->assertStatus(422);
    $responseInvalid->assertJsonValidationErrors(['emails.0']);
});

test('sendReport successfully sends report to multiple recipients via ResendService', function () {
    Storage::fake('public');

    $report = SpecimenReport::create([
        'report_file' => 'reports/test_report_multi.pdf',
        'report_date' => now()->toDateString(),
    ]);
    Storage::disk('public')->put('reports/test_report_multi.pdf', 'Sample PDF Content');

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0013-09-2026',
        'customer' => $this->customer->id,
        'referrer' => $this->referrer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'priority_id' => $this->priority->id,
        'status' => 'finalized',
        'report_id' => $report->id,
        'access_token' => 'token-123',
        'delivery_token' => 'deliv-123',
    ]);

    $mockResend = Mockery::mock(ResendService::class);
    $mockResend->shouldReceive('sendEmail')
        ->twice()
        ->with(
            Mockery::type('string'),
            'Reporte Listo — BIO-0013-09-2026',
            Mockery::on(fn ($html) => str_contains($html, 'BIO-0013-09-2026') && str_contains($html, 'Mensaje personalizado de prueba')),
            Mockery::on(fn ($attachs) => count($attachs) === 1 && $attachs[0]['filename'] === 'Reporte_BIO-0013-09-2026.pdf')
        )
        ->andReturn(true);

    app()->instance(ResendService::class, $mockResend);

    $response = $this->actingAs($this->user)->postJson(route('specimens.send-report', $specimen), [
        'emails' => ['juan.perez@example.com', 'dr.gomez@example.com'],
        'subject' => 'Reporte Listo — BIO-0013-09-2026',
        'custom_message' => 'Mensaje personalizado de prueba',
    ]);

    $response->assertOk();
    $response->assertJson([
        'message' => 'Reporte enviado exitosamente a 2 destinatarios.',
    ]);
});
