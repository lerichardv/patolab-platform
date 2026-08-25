<?php

use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
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
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    Gate::define('reports.billing_summary.view', fn () => true);
    Gate::define('specimen-groups.view', fn () => true);
    Gate::define('specimen-groups.create', fn () => true);

    // Setup base data
    $this->customer = Customer::factory()->create(['name' => 'John Doe']);
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->specimenType = SpecimenType::create(['name' => 'Biopsy', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Routine Biopsy',
        'code' => 'RB',
        'active' => true,
    ]);
    $this->category = SpecimenCategory::create(['name' => 'Category A', 'quantity' => 1]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Smith', 'referrer_type' => $referrerType->id, 'active' => true]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'ABC-DEF',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2030-12-31',
        'status' => 'active',
    ]);
});

test('billing summary report shows only specimens added in date range for grouped invoices', function () {
    Carbon::setTestNow('2026-08-01 10:00:00');

    // Create a group invoice (non-credit, cash)
    $invoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'total' => 1000,
        'total_paid' => 1000,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $group = SpecimenGroup::create([
        'name' => 'John Doe - Group',
        'invoice_id' => $invoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'token123',
    ]);
    $invoice->update(['group_id' => $group->id]);

    // Specimen 1: Added on 2026-08-01
    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $igs1 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'group_id' => $group->id,
        'specimen_id' => $specimen1->id,
        'quantity' => 1,
        'amount' => 500,
        'total' => 500,
    ]);
    $igs1->created_at = Carbon::parse('2026-08-01 10:00:00');
    $igs1->save();

    // Specimen 2: Added on 2026-08-02
    Carbon::setTestNow('2026-08-02 11:00:00');

    $specimen2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $igs2 = InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'group_id' => $group->id,
        'specimen_id' => $specimen2->id,
        'quantity' => 1,
        'amount' => 500,
        'total' => 500,
    ]);
    $igs2->created_at = Carbon::parse('2026-08-02 11:00:00');
    $igs2->save();

    // Assert that when querying for 2026-08-01, only the first specimen is returned
    $response1 = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index', [
            'date_from' => '2026-08-01',
            'date_to' => '2026-08-01',
        ]));

    $response1->assertOk();
    $page1 = $response1->viewData('page');
    $activeInvoices1 = $page1['props']['activeInvoices'];
    expect($activeInvoices1['data'])->toHaveCount(1);
    expect($activeInvoices1['data'][0]['id'])->toBe('igs-'.$igs1->id);
    expect($activeInvoices1['data'][0]['date'])->toContain('2026-08-01');

    // Assert that when querying for 2026-08-02, only the second specimen is returned
    $response2 = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index', [
            'date_from' => '2026-08-02',
            'date_to' => '2026-08-02',
        ]));

    $response2->assertOk();
    $page2 = $response2->viewData('page');
    $activeInvoices2 = $page2['props']['activeInvoices'];
    expect($activeInvoices2['data'])->toHaveCount(1);
    expect($activeInvoices2['data'][0]['id'])->toBe('igs-'.$igs2->id);
    expect($activeInvoices2['data'][0]['date'])->toContain('2026-08-02');
});

test('specimen group search lists only groups paid in credit with remaining balance', function () {
    // 1. Group A: paid in cash (not credit)
    $invoiceA = Invoice::create([
        'full_invoice_number' => '000-001-01-00000002',
        'invoice_number' => '00000002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'total' => 500,
        'total_paid' => 500,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $groupA = SpecimenGroup::create([
        'name' => 'Cash Group',
        'invoice_id' => $invoiceA->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'tokenA',
    ]);
    $invoiceA->update(['group_id' => $groupA->id]);

    // 2. Group B: paid in credit, but fully paid (amount_remaining = 0)
    $creditB = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500,
        'amount_paid' => 500,
        'amount_remaining' => 0,
        'is_group' => true,
    ]);
    $invoiceB = Invoice::create([
        'full_invoice_number' => '000-001-01-00000003',
        'invoice_number' => '00000003',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $creditB->id,
        'total' => 500,
        'total_paid' => 500,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $groupB = SpecimenGroup::create([
        'name' => 'Paid Credit Group',
        'invoice_id' => $invoiceB->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'tokenB',
    ]);
    $invoiceB->update(['group_id' => $groupB->id]);
    $creditB->update(['group_id' => $groupB->id]);

    // 3. Group C: paid in credit, active/unpaid (amount_remaining > 0)
    $creditC = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500,
        'amount_paid' => 100,
        'amount_remaining' => 400,
        'is_group' => true,
    ]);
    $invoiceC = Invoice::create([
        'full_invoice_number' => '000-001-01-00000004',
        'invoice_number' => '00000004',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $creditC->id,
        'total' => 500,
        'total_paid' => 100,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $groupC = SpecimenGroup::create([
        'name' => 'Active Credit Group',
        'invoice_id' => $invoiceC->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'tokenC',
    ]);
    $invoiceC->update(['group_id' => $groupC->id]);
    $creditC->update(['group_id' => $groupC->id]);

    // Query search endpoint
    $response = $this->actingAs($this->user)
        ->getJson(route('specimen-groups.search', ['q' => '']));

    $response->assertOk();
    $data = $response->json('data');

    // Only Group C should be returned
    expect($data)->toHaveCount(1);
    expect($data[0]['id'])->toBe($groupC->id);
    expect($data[0]['name'])->toBe('Active Credit Group');
});

test('cannot add specimens to groups that are not credit or are already paid', function () {
    // 1. Group A: Cash (not credit)
    $invoiceA = Invoice::create([
        'full_invoice_number' => '000-001-01-00000005',
        'invoice_number' => '00000005',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'total' => 500,
        'total_paid' => 500,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $groupA = SpecimenGroup::create([
        'name' => 'Cash Group A',
        'invoice_id' => $invoiceA->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'tokenA5',
    ]);
    $invoiceA->update(['group_id' => $groupA->id]);

    // Attempt to add specimens should fail validation
    $responseA = $this->actingAs($this->user)
        ->post(route('specimen-groups.add-specimens', $groupA->id), [
            'payment_type' => 'cash',
            'specimens' => [
                [
                    'customer' => $this->customer->id,
                    'specimen_type' => $this->specimenType->id,
                    'specimen_type_examination' => $this->examination->id,
                    'specimen_category' => $this->category->id,
                    'referrer' => $this->referrer->id,
                    'status' => 'received',
                    'priority_id' => $this->priority->id,
                    'selected_price' => '100',
                    'quantity' => 1,
                ],
            ],
        ]);
    $responseA->assertSessionHasErrors(['payment_type']);

    // 2. Group B: Credit, but fully paid
    $creditB = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500,
        'amount_paid' => 500,
        'amount_remaining' => 0,
        'is_group' => true,
    ]);
    $invoiceB = Invoice::create([
        'full_invoice_number' => '000-001-01-00000006',
        'invoice_number' => '00000006',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $creditB->id,
        'total' => 500,
        'total_paid' => 500,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $groupB = SpecimenGroup::create([
        'name' => 'Paid Credit Group B',
        'invoice_id' => $invoiceB->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'tokenB6',
    ]);
    $invoiceB->update(['group_id' => $groupB->id]);
    $creditB->update(['group_id' => $groupB->id]);

    // Attempt to add specimens should fail validation
    $responseB = $this->actingAs($this->user)
        ->post(route('specimen-groups.add-specimens', $groupB->id), [
            'payment_type' => 'credit',
            'specimens' => [
                [
                    'customer' => $this->customer->id,
                    'specimen_type' => $this->specimenType->id,
                    'specimen_type_examination' => $this->examination->id,
                    'specimen_category' => $this->category->id,
                    'referrer' => $this->referrer->id,
                    'status' => 'received',
                    'priority_id' => $this->priority->id,
                    'selected_price' => '100',
                    'quantity' => 1,
                ],
            ],
        ]);
    $responseB->assertSessionHasErrors(['payment_type']);
});
