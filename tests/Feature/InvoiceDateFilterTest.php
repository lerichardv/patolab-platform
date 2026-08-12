<?php

use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\CreditInvoiceSpecimen;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceGroupSpecimen;
use App\Models\Location;
use App\Models\Permission;
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
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('invoice list filters individual invoices by invoice created_at and grouped invoices by specimen created_at', function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
        'email_verified_at' => now(),
    ]);

    $viewPermission = Permission::create(['slug' => 'invoices.view', 'name' => 'Ver Facturas']);
    $role->permissions()->attach($viewPermission);

    $location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => '123-456',
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

    $customer = Customer::factory()->create();
    $specimenType = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'name' => 'Apendicectomía',
        'active' => true,
        'specimen_type' => $specimenType->id,
    ]);
    $category = SpecimenCategory::create(['name' => 'Biopsias', 'active' => true, 'quantity' => 1]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create([
        'name' => 'Dr. House',
        'active' => true,
        'referrer_type' => $referrerType->id,
    ]);
    $priority = Priority::create(['name' => 'Alta', 'order' => 1, 'color' => '#FF0000']);

    // 1. Individual invoice #1: created_at on 2026-08-06 (outside target range 2026-08-07)
    $invoice1 = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 100.00,
        'discount' => 0.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'is_group' => false,
        'invoice_type' => 'specimen',
        'invoice_file' => 'invoice_1.pdf',
    ]);
    $invoice1->forceFill(['created_at' => '2026-08-06 12:00:00'])->save();

    // 2. Individual invoice #2: created_at on 2026-08-07 (inside target range 2026-08-07)
    $invoice2 = Invoice::create([
        'full_invoice_number' => 'INV-002',
        'invoice_number' => '002',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 100.00,
        'discount' => 0.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'is_group' => false,
        'invoice_type' => 'specimen',
        'invoice_file' => 'invoice_2.pdf',
    ]);
    $invoice2->forceFill(['created_at' => '2026-08-07 12:00:00'])->save();

    // 3. Grouped non-credit invoice #3: created_at on 2026-08-06 (outside range),
    // but its specimen is created on 2026-08-07 (inside range)
    $invoice3 = Invoice::create([
        'full_invoice_number' => 'INV-003',
        'invoice_number' => '003',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 100.00,
        'discount' => 0.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'is_group' => true,
        'invoice_type' => 'specimen',
        'invoice_file' => 'invoice_3.pdf',
    ]);
    $invoice3->forceFill(['created_at' => '2026-08-06 12:00:00'])->save();

    $group3 = SpecimenGroup::create([
        'name' => 'Group 3',
        'customer_id' => $customer->id,
        'invoice_id' => $invoice3->id,
    ]);
    $invoice3->update(['group_id' => $group3->id]);

    $specimen3 = Specimen::create([
        'sequence_code' => 'BIO-0003-2026',
        'customer' => $customer->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'status' => 'received',
        'group_id' => $group3->id,
    ]);
    $specimen3->forceFill(['created_at' => '2026-08-07 10:00:00'])->save();

    InvoiceGroupSpecimen::create([
        'invoice_id' => $invoice3->id,
        'group_id' => $group3->id,
        'specimen_id' => $specimen3->id,
        'quantity' => 1,
        'amount' => 100.00,
        'subtotal' => 100.00,
        'total' => 100.00,
    ]);

    // 4. Grouped credit invoice #4: created_at on 2026-08-06 (outside range),
    // but its specimen is created on 2026-08-07 (inside range)
    $invoice4 = Invoice::create([
        'full_invoice_number' => 'INV-004',
        'invoice_number' => '004',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'payment_type' => 'credit',
        'quantity' => 1,
        'amount' => 100.00,
        'discount' => 0.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'is_group' => true,
        'invoice_type' => 'specimen',
        'invoice_file' => 'invoice_4.pdf',
    ]);
    $invoice4->forceFill(['created_at' => '2026-08-06 12:00:00'])->save();

    $group4 = SpecimenGroup::create([
        'name' => 'Group 4',
        'customer_id' => $customer->id,
        'invoice_id' => $invoice4->id,
    ]);
    $invoice4->update(['group_id' => $group4->id]);

    $specimen4 = Specimen::create([
        'sequence_code' => 'BIO-0004-2026',
        'customer' => $customer->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'status' => 'received',
        'group_id' => $group4->id,
    ]);
    $specimen4->forceFill(['created_at' => '2026-08-07 10:00:00'])->save();

    $credit = Credit::create([
        'customer_id' => $customer->id,
        'credit_amount' => 100.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 100.00,
        'specimen_id' => $specimen4->id,
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $invoice4->id,
        'specimen_id' => $specimen4->id,
        'quantity' => 1,
        'amount' => 100.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'is_paid' => false,
    ]);

    // Request with date range 2026-08-07 to 2026-08-07
    $response = $this->actingAs($user)
        ->get(route('invoices.index', [
            'date_from' => '2026-08-07',
            'date_to' => '2026-08-07',
        ]));

    $response->assertStatus(200);

    // Assert that INV-002, INV-003, and INV-004 are returned, and INV-001 is filtered out
    $response->assertInertia(function (Assert $page) {
        $page->component('invoices/index')
            ->has('invoices.data', 3);

        $numbers = collect($page->toArray()['props']['invoices']['data'])->pluck('full_invoice_number');

        expect($numbers)->toContain('INV-002');
        expect($numbers)->toContain('INV-003');
        expect($numbers)->toContain('INV-004');
        expect($numbers)->not->toContain('INV-001');
    });
});
