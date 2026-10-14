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
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

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

test('can update group invoice with additional discount and recalculate consolidated total', function () {
    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $specimen2 = Specimen::create([
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
        'specimen_id' => $specimen1->id,
        'is_group' => true,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 1200.00,
        'discount' => 0.00,
        'subtotal' => 1200.00,
        'exempt_amount' => 1200.00,
        'total' => 1200.00,
        'total_paid' => 1200.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
    ]);

    $invSpec1 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen1->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
    ]);

    $invSpec2 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen2->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
    ]);

    $response = $this->put(route('invoices.update', $invoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 1200.00,
        'discount' => 50.00,
        'subtotal' => 1150.00,
        'exempt_amount' => 1150.00,
        'total' => 1150.00,
        'total_paid' => 1150.00,
        'group_specimens' => [
            [
                'id' => $invSpec1->id,
                'selected_price' => '600.00',
                'quantity' => 1,
                'additional_discount_enabled' => true,
                'additional_discount' => 50.00,
            ],
            [
                'id' => $invSpec2->id,
                'selected_price' => '600.00',
                'quantity' => 1,
                'additional_discount_enabled' => false,
                'additional_discount' => 0.00,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $invSpec1->refresh();
    expect($invSpec1->additional_discount_enabled)->toBeTrue()
        ->and((float) $invSpec1->additional_discount)->toEqual(50.00)
        ->and((float) $invSpec1->discount)->toEqual(50.00)
        ->and((float) $invSpec1->total)->toEqual(550.00);

    $invSpec2->refresh();
    expect((float) $invSpec2->total)->toEqual(600.00);

    $invoice->refresh();
    expect((float) $invoice->discount)->toEqual(50.00)
        ->and((float) $invoice->total)->toEqual(1150.00);
});

test('updating a specimen belonging to group preserves other invoice_specimens in group invoice', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'is_group' => true,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 1200.00,
        'discount' => 50.00,
        'subtotal' => 1150.00,
        'exempt_amount' => 1150.00,
        'total' => 1150.00,
        'total_paid' => 1150.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy.pdf',
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Grupo Test',
        'customer_id' => $this->customer->id,
        'invoice_id' => $invoice->id,
    ]);

    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
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
        'sequence_code' => 'BIO-0002-2026',
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

    $invoice->update(['specimen_id' => $specimen1->id]);

    $invSpec1 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen1->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'group_id' => $group->id,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
    ]);

    $invSpec2 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen2->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'group_id' => $group->id,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 50.00,
        'subtotal' => 550.00,
        'exempt_amount' => 550.00,
        'total' => 550.00,
        'selected_price' => '600.00',
        'additional_discount_enabled' => true,
        'additional_discount' => 50.00,
    ]);

    Gate::define('specimens.edit', fn () => true);

    $response = $this->put(route('specimens.update', $specimen1->id), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'selected_examination_ids' => [$this->examination->id],
        'examinations' => [
            [
                'examination_id' => $this->examination->id,
                'selected_price' => '600.00',
                'custom_specimen_price' => null,
                'quantity' => 1,
                'additional_discount_enabled' => true,
                'additional_discount' => 100.00,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    expect(InvoiceSpecimen::where('invoice_id', $invoice->id)->count())->toBe(2);

    $invSpec2->refresh();
    expect($invSpec2->additional_discount_enabled)->toBeTrue()
        ->and((float) $invSpec2->additional_discount)->toEqual(50.00)
        ->and((float) $invSpec2->total)->toEqual(550.00);

    $invSpec1Updated = InvoiceSpecimen::where('invoice_id', $invoice->id)
        ->where('specimen_id', $specimen1->id)
        ->first();

    expect($invSpec1Updated)->not->toBeNull()
        ->and($invSpec1Updated->additional_discount_enabled)->toBeTrue()
        ->and((float) $invSpec1Updated->additional_discount)->toEqual(100.00)
        ->and((float) $invSpec1Updated->total)->toEqual(500.00);

    $invoice->refresh();
    expect((float) $invoice->discount)->toEqual(150.00)
        ->and((float) $invoice->total)->toEqual(1050.00);
});
