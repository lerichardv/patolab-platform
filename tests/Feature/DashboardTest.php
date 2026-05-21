<?php

use App\Models\User;
use App\Models\Customer;
use App\Models\Specimen;
use App\Models\Invoice;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard and see metrics', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Create customers: 2 active, 1 inactive
    $customer1 = Customer::factory()->create(['active' => true]);
    Customer::factory()->create(['active' => true]);
    Customer::factory()->create(['active' => false]);

    // Setup required references for specimen
    $location = \App\Models\Location::create([
        'name' => 'Sucursal Principal',
        'rtn' => '12345678901234',
        'address' => 'Tegucigalpa',
        'phone' => '2222-2222',
        'email' => 'principal@patolab.com',
        'active' => true,
    ]);

    $specimenType = \App\Models\SpecimenType::create([
        'name' => 'Biopsia',
        'description' => 'Muestra de biopsia',
        'active' => true,
    ]);

    $examination = \App\Models\SpecimenTypeExamination::create([
        'specimen_type' => $specimenType->id,
        'name' => 'Biopsia Simple',
        'description' => 'Estudio simple',
        'active' => true,
    ]);

    $category = \App\Models\SpecimenCategory::create([
        'name' => 'Rutina',
        'unit' => 'days',
        'quantity' => 5,
        'active' => true,
    ]);

    $referrerType = \App\Models\ReferrerType::create([
        'name' => 'Médico Particular',
        'active' => true,
    ]);

    $referrer = \App\Models\Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);

    $priority = \App\Models\Priority::create([
        'name' => 'Normal',
        'color' => '#00ff00',
        'order' => 1,
    ]);

    // Create specimens: 2 active, 1 inactive
    $specimen1 = Specimen::create([
        'customer' => $customer1->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'anatomic_site' => 'Site 1',
        'diagnosis' => 'Diagnosis 1',
        'clinical_notes' => 'Notes 1',
        'priority_id' => $priority->id,
        'active' => true,
    ]);

    $specimen2 = Specimen::create([
        'customer' => $customer1->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'anatomic_site' => 'Site 2',
        'diagnosis' => 'Diagnosis 2',
        'clinical_notes' => 'Notes 2',
        'priority_id' => $priority->id,
        'active' => true,
    ]);

    $specimen3 = Specimen::create([
        'customer' => $customer1->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'anatomic_site' => 'Site 3',
        'diagnosis' => 'Diagnosis 3',
        'clinical_notes' => 'Notes 3',
        'priority_id' => $priority->id,
        'active' => false,
    ]);

    $caiRange = \App\Models\CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'ABCDEF-123456-ABCDEF-123456-ABCDEF-12',
        'full_prefix' => '000-001-01-',
        'emission' => '2026-01-01',
        'establishment' => '000',
        'document_type' => 'factura',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2027-01-01',
        'status' => 'active',
    ]);

    // Create invoices today (2 invoices, e.g. total 1500 and total 1200)
    Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer1->id,
        'specimen_id' => $specimen1->id,
        'payment_type' => 'cash',
        'amount' => 1500,
        'total' => 1500,
        'proof_of_payment' => 'proof.png',
        'invoice_file' => 'invoices/dummy1.pdf',
        'created_at' => now(),
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00000002',
        'invoice_number' => '00000002',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer1->id,
        'specimen_id' => $specimen2->id,
        'payment_type' => 'cash',
        'amount' => 1200,
        'total' => 1200,
        'proof_of_payment' => 'proof.png',
        'invoice_file' => 'invoices/dummy2.pdf',
        'created_at' => now(),
    ]);

    // Create invoice yesterday (should not be counted today)
    $yesterdayInvoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000003',
        'invoice_number' => '00000003',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer1->id,
        'specimen_id' => $specimen1->id,
        'payment_type' => 'cash',
        'amount' => 2000,
        'total' => 2000,
        'proof_of_payment' => 'proof.png',
        'invoice_file' => 'invoices/dummy3.pdf',
    ]);
    $yesterdayInvoice->created_at = now()->subDay();
    $yesterdayInvoice->save();

    // Create yesterday specimen (should not be in today's specimens list)
    $yesterdaySpecimen = Specimen::create([
        'customer' => $customer1->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'anatomic_site' => 'Site Yesterday',
        'diagnosis' => 'Diagnosis Yesterday',
        'clinical_notes' => 'Notes Yesterday',
        'priority_id' => $priority->id,
        'active' => true,
    ]);
    $yesterdaySpecimen->created_at = now()->subDay();
    $yesterdaySpecimen->save();

    $response = $this->get(route('dashboard'));
    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('specimensCount', 3) // 2 today + 1 yesterday
        ->where('specimensThisWeekCount', 3)
        ->where('moneyMadeToday', 2700)
        ->where('customersCount', 2)
        ->has('specimensWeeklyData', 7)
        ->where('specimensWeeklyData.3.day', 'Jueves')
        ->where('specimensWeeklyData.3.count', 2) // only today's specimens are created on Thursday in mock
        ->where('specimensWeeklyData.3.earnings', 2700)
        ->where('specimensWeeklyData.0.count', 0)
        ->where('specimensWeeklyData.0.earnings', 0)
        ->has('todaySpecimens', 2)
        ->where('todaySpecimens.0.customer_relation.name', $customer1->name)
        ->where('todaySpecimens.0.invoice_relation.total', '1500.00')
        ->where('todaySpecimens.1.invoice_relation.total', '1200.00')
    );
});
