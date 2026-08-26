<?php

use App\Models\Customer;
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

uses(RefreshDatabase::class);

test('returns 400 invalid view when verification token parameter is missing', function () {
    $response = $this->get('/v/NONEXISTENT');

    $response->assertStatus(400);
    $response->assertSee('Parámetro de autenticación ausente');
});

test('returns 404 invalid view when report code or token is invalid', function () {
    $response = $this->get('/v/INVALIDCODE?t=INVALIDTOKEN');

    $response->assertStatus(404);
    $response->assertSee('Documento No Válido');
    $response->assertSee('El código de informe o el token de verificación no coincide');
});

test('returns 200 valid view when report code and token match a finalized specimen', function () {
    $report = SpecimenReport::create([
        'report_code' => 'VERIFY123456',
        'report_validation_token' => 'TOKEN1234567',
        'report_date' => now()->toDateString(),
        'finalization_date' => now()->toDateString(),
    ]);

    $customer = Customer::create([
        'name' => 'Juan Pérez Validador',
        'id_number' => '0801199012345',
        'type' => 'cliente',
        'age' => 45,
        'gender' => 'M',
    ]);

    $referrerType = ReferrerType::create([
        'name' => 'Médico Especialista',
    ]);

    $referrer = Referrer::create([
        'name' => 'Dr. Carlos Médico',
        'referrer_type' => $referrerType->id,
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Patología General',
        'quantity' => 1,
    ]);

    $type = SpecimenType::create([
        'name' => 'Biopsia Especial',
        'code' => 'BE',
    ]);

    $priority = Priority::create([
        'name' => 'Normal',
        'color' => '#000000',
        'order' => 1,
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-VERIFY-001',
        'customer' => $customer->id,
        'referrer' => $referrer->id,
        'specimen_category' => $category->id,
        'specimen_type' => $type->id,
        'priority_id' => $priority->id,
        'report_id' => $report->id,
        'status' => 'finalized',
        'anatomic_site' => 'Biopsia de Piel',
        'access_token' => 'access_token_123',
        'delivery_token' => 'delivery_token_123',
    ]);

    $response = $this->get('/v/VERIFY123456?t=TOKEN1234567');

    $response->assertStatus(200);
    $response->assertSee('Informe Auténtico');
    $response->assertSee('VERIFY123456');
    $response->assertSee('TEST-VERIFY-001');
    $response->assertSee('Juan Pérez Validador');
});

test('returns 200 valid view listing all examinations from specimen_examinations pivot', function () {
    $report = SpecimenReport::create([
        'report_code' => 'MULTIEXAM123',
        'report_validation_token' => 'TOKEMMULTI12',
        'report_date' => now()->toDateString(),
        'finalization_date' => now()->toDateString(),
    ]);

    $customer = Customer::create([
        'name' => 'Maria Lopez',
        'id_number' => '0801199555555',
        'type' => 'cliente',
    ]);

    $referrerType = ReferrerType::create(['name' => 'General']);
    $referrer = Referrer::create(['name' => 'Dr. Smith', 'referrer_type' => $referrerType->id]);
    $category = SpecimenCategory::create(['name' => 'Patología', 'quantity' => 1]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO']);
    $priority = Priority::create(['name' => 'Urgente', 'color' => '#ff0000', 'order' => 1]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-9999-2026',
        'customer' => $customer->id,
        'referrer' => $referrer->id,
        'specimen_category' => $category->id,
        'specimen_type' => $type->id,
        'priority_id' => $priority->id,
        'report_id' => $report->id,
        'status' => 'finalized',
        'access_token' => 'acc_9999',
        'delivery_token' => 'del_9999',
    ]);

    $exam1 = SpecimenTypeExamination::create(['specimen_type' => $type->id, 'name' => 'Inmunohistoquímica HER2']);
    $exam2 = SpecimenTypeExamination::create(['specimen_type' => $type->id, 'name' => 'Marcadores Tumorales Estrógeno']);

    $specimen->examinations()->attach([$exam1->id, $exam2->id]);

    $response = $this->get('/v/MULTIEXAM123?t=TOKEMMULTI12');

    $response->assertStatus(200);
    $response->assertSee('Inmunohistoquímica HER2');
    $response->assertSee('Marcadores Tumorales Estrógeno');
});

test('generates validation QR code when saving an edited report on a finalized specimen', function () {
    $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $user = User::factory()->create(['role_id' => $role->id]);
    $report = SpecimenReport::create([
        'report_date' => now()->toDateString(),
        'finalization_date' => now()->toDateString(),
        'macroscopy_html' => '<p>Macroscopía inicial</p>',
    ]);

    $customer = Customer::create(['name' => 'Ana Torres', 'id_number' => '0801199100000', 'type' => 'cliente']);
    $referrerType = ReferrerType::create(['name' => 'General']);
    $referrer = Referrer::create(['name' => 'Dr. House', 'referrer_type' => $referrerType->id]);
    $category = SpecimenCategory::create(['name' => 'Patología', 'quantity' => 1]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO']);
    $priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-7777-2026',
        'customer' => $customer->id,
        'referrer' => $referrer->id,
        'specimen_category' => $category->id,
        'specimen_type' => $type->id,
        'priority_id' => $priority->id,
        'report_id' => $report->id,
        'status' => 'finalized',
        'access_token' => 'acc_7777',
        'delivery_token' => 'del_7777',
    ]);

    $specimen->users()->attach($user->id, ['macroscopy_access' => true, 'microscopy_access' => true]);

    expect($report->report_validation_qr_code)->toBeNull();

    $response = $this->actingAs($user)->postJson("/specimens/{$specimen->sequence_code}/report-editor/save", [
        'macroscopy_html' => '<p>Macroscopía editada</p>',
    ]);

    $response->assertStatus(200);

    $report->refresh();
    expect($report->report_validation_qr_code)->not->toBeNull();
    expect($report->report_validation_token)->not->toBeNull();
});
