<?php

use App\Models\Customer;
use App\Models\Invoice;
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

test('cannot edit a non-credit specimen invoice with an invoice number to credit', function () {
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
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'total_paid' => 1000.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
        'invoice_number' => '000-001-01-00000001',
        'full_invoice_number' => '000-001-01-00000001',
    ]);

    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'total_paid' => 0.00,
    ]);

    $response->assertSessionHasErrors(['payment_type']);
});

test('can edit a non-credit specimen invoice without invoice number to credit', function () {
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
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'total_paid' => 1000.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
        'invoice_number' => null,
        'full_invoice_number' => null,
    ]);

    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'total_paid' => 0.00,
    ]);

    $response->assertSessionHasNoErrors();
    expect($invoice->fresh()->payment_type)->toBe('credit');
});

test('cannot edit a credit specimen invoice to non-credit payment method', function () {
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
        'payment_type' => 'credit',
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'total_paid' => 0.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
        'invoice_number' => null,
        'full_invoice_number' => null,
    ]);

    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'total_paid' => 1000.00,
    ]);

    $response->assertSessionHasErrors(['payment_type']);
    expect($invoice->fresh()->payment_type)->toBe('credit');
});
