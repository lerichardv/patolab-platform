<?php

use App\Jobs\SendSpecimenEmailJob;
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
use App\Services\ResendService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

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
        'email' => 'john.doe@example.com',
        'phone' => '12345678',
        'age' => 30,
        'gender' => 'male',
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
});

test('specimen creation dispatches the created email job', function () {
    Queue::fake();

    Specimen::create([
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

    Queue::assertPushed(SendSpecimenEmailJob::class, function ($job) {
        $reflection = new ReflectionProperty($job, 'type');
        $reflection->setAccessible(true);
        $type = $reflection->getValue($job);

        $reflectionSpecimen = new ReflectionProperty($job, 'specimen');
        $reflectionSpecimen->setAccessible(true);
        $specimen = $reflectionSpecimen->getValue($job);

        return $type === 'created' && $specimen->sequence_code === 'BIO-0001-2026';
    });
});

test('specimen status update to finalized dispatches the finalized email job', function () {
    Queue::fake();

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'access_token' => 'test-access-token-2',
        'delivery_token' => 'test-delivery-token-2',
    ]);

    // Initial creation push should be ignored since we want to check finalization update
    Queue::fake();

    $specimen->update([
        'status' => 'finalized',
    ]);

    Queue::assertPushed(SendSpecimenEmailJob::class, function ($job) {
        $reflection = new ReflectionProperty($job, 'type');
        $reflection->setAccessible(true);
        $type = $reflection->getValue($job);

        $reflectionSpecimen = new ReflectionProperty($job, 'specimen');
        $reflectionSpecimen->setAccessible(true);
        $specimen = $reflectionSpecimen->getValue($job);

        return $type === 'finalized' && $specimen->sequence_code === 'BIO-0002-2026';
    });
});

test('SendSpecimenEmailJob handles created email type successfully', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0003-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'access_token' => 'test-access-token-3',
        'delivery_token' => 'test-delivery-token-3',
    ]);

    // Mock ResendService
    $mockResend = Mockery::mock(ResendService::class);
    $mockResend->shouldReceive('sendEmail')
        ->once()
        ->with(
            $this->customer->email,
            Mockery::on(fn ($subj) => str_contains($subj, 'Registro de Muestra')),
            Mockery::on(fn ($html) => str_contains($html, 'BIO-0003-2026') && str_contains($html, 'Ver Estado en Tiempo Real')),
            Mockery::on(fn ($attachs) => count($attachs) === 0)
        )
        ->andReturn(true);

    $job = new SendSpecimenEmailJob($specimen, 'created');
    $job->handle($mockResend);
});

test('SendSpecimenEmailJob handles finalized email type with PDF report successfully', function () {
    Storage::fake('public');

    // Create Report
    $report = SpecimenReport::create([
        'report_file' => 'reports/test_report.pdf',
        'report_date' => now(),
    ]);

    Storage::disk('public')->put('reports/test_report.pdf', 'Dummy PDF Content');

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0004-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'finalized',
        'report_id' => $report->id,
        'access_token' => 'test-access-token-4',
        'delivery_token' => 'test-delivery-token-4',
    ]);

    // Mock ResendService
    $mockResend = Mockery::mock(ResendService::class);
    $mockResend->shouldReceive('sendEmail')
        ->once()
        ->with(
            $this->customer->email,
            Mockery::on(fn ($subj) => str_contains($subj, 'Reporte Listo')),
            Mockery::on(fn ($html) => str_contains($html, 'BIO-0004-2026') && str_contains($html, 'Ver Reporte y Estado en Portal')),
            Mockery::on(function ($attachs) {
                // Should only contain the PDF attachment (no inline logo)
                if (count($attachs) !== 1) {
                    return false;
                }
                return $attachs[0]['filename'] === 'Reporte_BIO-0004-2026.pdf' && $attachs[0]['content'] === base64_encode('Dummy PDF Content');
            })
        )
        ->andReturn(true);

    $job = new SendSpecimenEmailJob($specimen, 'finalized');
    $job->handle($mockResend);
});

test('SendSpecimenEmailJob skips sending when customer has no email address configured', function () {
    $customerWithoutEmail = Customer::factory()->create([
        'state' => $this->department->id,
        'city' => $this->municipality->id,
        'name' => 'Jane Doe',
        'email' => '',
        'phone' => '87654321',
        'age' => 25,
        'gender' => 'female',
        'active' => true,
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0005-2026',
        'customer' => $customerWithoutEmail->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'access_token' => 'test-access-token-5',
        'delivery_token' => 'test-delivery-token-5',
    ]);

    // Mock ResendService - should NEVER receive sendEmail call
    $mockResend = Mockery::mock(ResendService::class);
    $mockResend->shouldNotReceive('sendEmail');

    $job = new SendSpecimenEmailJob($specimen, 'created');
    $job->handle($mockResend);
});

test('SendSpecimenGroupEmailJob sends a group summary email to the main customer', function () {
    $location = \App\Models\Location::create([
        'name' => 'Main Lab',
        'code' => '001',
        'active' => true,
    ]);

    $caiRange = \App\Models\CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2027-12-31',
        'status' => 'active',
    ]);

    $invoice = \App\Models\Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    $group = \App\Models\SpecimenGroup::create([
        'name' => 'Test Group',
        'customer_id' => $this->customer->id,
        'invoice_id' => $invoice->id,
    ]);

    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0006-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'group_id' => $group->id,
    ]);

    // Mock ResendService
    $mockResend = Mockery::mock(ResendService::class);
    $mockResend->shouldReceive('sendEmail')
        ->once()
        ->with(
            $this->customer->email,
            Mockery::on(fn ($subj) => str_contains($subj, 'Registro de Muestras Registrado')),
            Mockery::on(fn ($html) => str_contains($html, 'BIO-0006-2026') && str_contains($html, 'John Doe')),
            Mockery::on(fn ($attachs) => count($attachs) === 0)
        )
        ->andReturn(true);

    $job = new \App\Jobs\SendSpecimenGroupEmailJob($group, 'created');
    $job->handle($mockResend);
});

test('specimen creation does not dispatch individual created email if it has a group_id', function () {
    Queue::fake();

    $location = \App\Models\Location::create([
        'name' => 'Main Lab 2',
        'code' => '002',
        'active' => true,
    ]);

    $caiRange = \App\Models\CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'E5F6G7H8',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2027-12-31',
        'status' => 'active',
    ]);

    $invoice = \App\Models\Invoice::create([
        'full_invoice_number' => 'INV-002',
        'invoice_number' => '002',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    $group = \App\Models\SpecimenGroup::create([
        'name' => 'Test Group 2',
        'customer_id' => $this->customer->id,
        'invoice_id' => $invoice->id,
    ]);

    Specimen::create([
        'sequence_code' => 'BIO-0007-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'group_id' => $group->id,
    ]);

    Queue::assertNotPushed(SendSpecimenEmailJob::class);
});
