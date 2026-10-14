<?php

use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
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

test('can edit a non-credit specimen invoice without invoice number to credit and creates Credit', function () {
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

    $invSpec = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'is_paid' => true,
        'quantity_paid' => 1,
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
    $invoice->refresh();
    expect($invoice->payment_type)->toBe('credit');
    expect($invoice->credit_payment_id)->not->toBeNull();
    expect((float) $invoice->total_paid)->toBe(0.00);

    $credit = Credit::find($invoice->credit_payment_id);
    expect($credit)->not->toBeNull();
    expect((float) $credit->credit_amount)->toBe(1000.00);
    expect((float) $credit->amount_paid)->toBe(0.00);
    expect((float) $credit->amount_remaining)->toBe(1000.00);
    expect($credit->status)->toBe('pending');
    expect($credit->is_group)->toBeFalse();
    expect($credit->specimen_id)->toBe($specimen->id);

    $invSpec->refresh();
    expect($invSpec->credit_id)->toBe($credit->id);
    expect($invSpec->is_paid)->toBeFalse();
    expect($invSpec->quantity_paid)->toBe(0);
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

test('cannot edit a credit group invoice to non-credit payment method', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 2,
        'amount' => 2000.00,
        'discount' => 0.00,
        'subtotal' => 2000.00,
        'exempt_amount' => 2000.00,
        'total' => 2000.00,
        'total_paid' => 0.00,
        'invoice_type' => 'group',
        'is_group' => true,
        'invoice_file' => 'dummy.pdf',
        'invoice_number' => null,
        'full_invoice_number' => null,
    ]);

    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 2000.00,
        'discount' => 0.00,
        'subtotal' => 2000.00,
        'exempt_amount' => 2000.00,
        'total' => 2000.00,
        'total_paid' => 2000.00,
    ]);

    $response->assertSessionHasErrors(['payment_type']);
    expect($invoice->fresh()->payment_type)->toBe('credit');
});

test('editing a group invoice without invoice number to credit creates Credit and updates specimens', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'is_group' => true,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 2000.00,
        'discount' => 0.00,
        'subtotal' => 2000.00,
        'exempt_amount' => 2000.00,
        'total' => 2000.00,
        'total_paid' => 2000.00,
        'invoice_type' => 'group',
        'invoice_file' => 'dummy.pdf',
        'invoice_number' => null,
        'full_invoice_number' => null,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Grupo Test - 2 Muestras',
        'customer_id' => $this->customer->id,
        'invoice_id' => $invoice->id,
        'access_token' => 'token123',
    ]);
    $invoice->update(['group_id' => $group->id]);

    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0010-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'BIO-0011-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $igs1 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen1->id,
        'examination_id' => $this->examination->id,
        'group_id' => $group->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'is_paid' => true,
        'quantity_paid' => 1,
        'selected_price' => '1000.00',
    ]);

    $igs2 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen2->id,
        'examination_id' => $this->examination->id,
        'group_id' => $group->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'exempt_amount' => 1000.00,
        'total' => 1000.00,
        'is_paid' => true,
        'quantity_paid' => 1,
        'selected_price' => '1000.00',
    ]);

    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 2,
        'amount' => 2000.00,
        'discount' => 0.00,
        'subtotal' => 2000.00,
        'exempt_amount' => 2000.00,
        'total' => 2000.00,
        'total_paid' => 0.00,
        'has_initial_payment' => true,
        'initial_payment_amount' => 500.00,
        'initial_payment_type' => 'cash',
    ]);

    $response->assertSessionHasNoErrors();
    $invoice->refresh();
    expect($invoice->payment_type)->toBe('credit');
    expect($invoice->credit_payment_id)->not->toBeNull();
    expect((float) $invoice->total_paid)->toBe(500.00);

    $credit = Credit::find($invoice->credit_payment_id);
    expect($credit)->not->toBeNull();
    expect((float) $credit->credit_amount)->toBe(2000.00);
    expect((float) $credit->amount_paid)->toBe(500.00);
    expect((float) $credit->amount_remaining)->toBe(1500.00);
    expect($credit->status)->toBe('pending');
    expect($credit->is_group)->toBeTrue();
    expect($credit->group_id)->toBe($group->id);

    $igs1->refresh();
    $igs2->refresh();
    expect($igs1->credit_id)->toBe($credit->id);
    expect($igs1->is_paid)->toBeFalse();
    expect($igs1->quantity_paid)->toBe(0);
    expect($igs2->credit_id)->toBe($credit->id);
    expect($igs2->is_paid)->toBeFalse();
    expect($igs2->quantity_paid)->toBe(0);
});
