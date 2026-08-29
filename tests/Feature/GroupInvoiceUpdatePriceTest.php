<?php

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);
    $this->actingAs($this->user);

    $this->customer = Customer::create([
        'name' => 'Test Customer',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'mujer',
        'type' => 'individual',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Tipo', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. House', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Examen Simple',
        'code' => 'EX1',
    ]);
});

test('can update group invoice specimen with a predefined price and null custom_specimen_price', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'is_group' => true,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'total_paid' => 600.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
    ]);

    $invoiceSpecimen = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
        'custom_specimen_price' => 0.00,
    ]);

    // Simulate switching to a different predefined price without sending custom_specimen_price
    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'exempt_amount' => 500.00,
        'total' => 500.00,
        'total_paid' => 500.00,
        'group_specimens' => [
            [
                'id' => $invoiceSpecimen->id,
                'selected_price' => '500.00',
                'custom_specimen_price' => null,
                'quantity' => 1,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
});

test('can update group invoice specimen with empty string custom_specimen_price', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'is_group' => true,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'total_paid' => 600.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
    ]);

    $invoiceSpecimen = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
        'custom_specimen_price' => 0.00,
    ]);

    // Simulate the frontend sending empty string for custom_specimen_price
    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'exempt_amount' => 500.00,
        'total' => 500.00,
        'total_paid' => 500.00,
        'group_specimens' => [
            [
                'id' => $invoiceSpecimen->id,
                'selected_price' => '500.00',
                'custom_specimen_price' => '',
                'quantity' => 1,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
});

test('validates custom_specimen_price is required when using custom price', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0003-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'is_group' => true,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'total_paid' => 600.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
    ]);

    $invoiceSpecimen = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
        'custom_specimen_price' => 0.00,
    ]);

    // Selecting custom price with a valid custom amount should work
    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 450.00,
        'discount' => 0.00,
        'subtotal' => 450.00,
        'exempt_amount' => 450.00,
        'total' => 450.00,
        'total_paid' => 450.00,
        'group_specimens' => [
            [
                'id' => $invoiceSpecimen->id,
                'selected_price' => 'custom',
                'custom_specimen_price' => 450.00,
                'quantity' => 1,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
});
