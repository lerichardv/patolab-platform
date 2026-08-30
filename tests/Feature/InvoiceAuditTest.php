<?php

use App\Models\AuditLog;
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

    Gate::define('invoices.view', fn () => true);
    Gate::define('invoices.manage', fn () => true);

    $this->customer = Customer::factory()->create();

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Urgente',
        'quantity' => 1,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Médico',
        'active' => true,
    ]);

    $this->referrer = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Alta',
        'color' => '#ef4444',
        'order' => 10,
        'active' => true,
    ]);

    $this->specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $this->invoice1 = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => 1,
        'customer_id' => $this->customer->id,
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

    $this->invoiceSpecimen1 = InvoiceSpecimen::create([
        'invoice_id' => $this->invoice1->id,
        'specimen_id' => $this->specimen1->id,
        'is_group' => false,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
    ]);
});

test('it returns audit logs grouped by session code', function () {
    // Act: Update InvoiceSpecimen to trigger Auditable trail
    $this->actingAs($this->user);
    $this->invoiceSpecimen1->update([
        'amount' => 500.00,
        'total' => 500.00,
    ]);

    $response = $this->getJson(route('invoices.audit-history', $this->invoice1->id));

    $response->assertStatus(200);

    $data = $response->json();
    expect($data)->not->toBeEmpty();

    $session = $data[0];
    expect($session['invoice_id'])->toBe($this->invoice1->id);
    expect($session['user_name'])->toBe($this->user->name);
    expect($session['changes_made'])->toHaveCount(2); // amount and total
});

test('it restores audit changes and sets origin to changes history', function () {
    $this->actingAs($this->user);

    // Trigger update and get the audit logs
    $this->invoiceSpecimen1->update([
        'amount' => 500.00,
    ]);

    $log = AuditLog::where('table', 'invoice_specimens')
        ->where('column', 'amount')
        ->first();

    expect($log)->not->toBeNull();
    expect(floatval($log->old_value))->toEqual(600.00);
    expect(floatval($log->new_value))->toEqual(500.00);
    expect($log->origin)->toBe('system'); // default value

    // Act: Restore the change using the restore endpoint
    $response = $this->postJson(route('invoices.restore-audit-change', $this->invoice1->id), [
        'invoice_specimen_id' => $this->invoiceSpecimen1->id,
        'column' => 'amount',
        'value' => $log->old_value,
    ]);

    $response->assertStatus(200);

    // Assert: Check restored value
    $this->invoiceSpecimen1->refresh();
    expect($this->invoiceSpecimen1->amount)->toEqual(600.00);

    // Assert: Verify new audit log generated with 'changes history' origin
    $restoreLog = AuditLog::where('table', 'invoice_specimens')
        ->where('column', 'amount')
        ->orderBy('id', 'desc')
        ->first();

    expect($restoreLog)->not->toBeNull();
    expect(floatval($restoreLog->old_value))->toEqual(500.00);
    expect(floatval($restoreLog->new_value))->toEqual(600.00);
    expect($restoreLog->origin)->toBe('changes history');
});

test('it denies restoring specimen from another invoice', function () {
    $invoice2 = Invoice::create([
        'full_invoice_number' => '000-001-01-00000002',
        'invoice_number' => 2,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 700.00,
        'discount' => 0.00,
        'subtotal' => 700.00,
        'exempt_amount' => 700.00,
        'total' => 700.00,
        'total_paid' => 700.00,
        'invoice_type' => 'specimen',
        'invoice_file' => 'dummy2.pdf',
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);

    $invoiceSpecimen2 = InvoiceSpecimen::create([
        'invoice_id' => $invoice2->id,
        'specimen_id' => $specimen2->id,
        'is_group' => false,
        'quantity' => 1,
        'amount' => 700.00,
        'discount' => 0.00,
        'subtotal' => 700.00,
        'exempt_amount' => 700.00,
        'total' => 700.00,
    ]);

    $this->actingAs($this->user);

    // Act: Try to restore invoiceSpecimen2 using invoice1 endpoint
    $response = $this->postJson(route('invoices.restore-audit-change', $this->invoice1->id), [
        'invoice_specimen_id' => $invoiceSpecimen2->id,
        'column' => 'amount',
        'value' => 600.00,
    ]);

    $response->assertStatus(403);
});
