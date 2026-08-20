<?php

use App\Models\CaiRange;
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

beforeEach(function () {
    $this->role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $viewPermission = Permission::create(['slug' => 'invoices.view', 'name' => 'Ver Facturas']);
    $this->role->permissions()->attach($viewPermission);

    $this->customer = Customer::create([
        'name' => 'Jane Doe',
        'id_number' => '0801199512345',
        'phone' => '99998888',
        'gender' => 'mujer',
        'type' => 'individual',
    ]);

    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
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
});

test('invoice listing search by specimen sequence code finds single specimen invoice', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'SINGLE-SPEC-001',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => false,
    ]);

    $invoice = Invoice::create([
        'invoice_number' => '00000001',
        'full_invoice_number' => '000-001-01-00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
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

    $response = $this->actingAs($this->user)->get(route('invoices.index', [
        'search' => 'SINGLE-SPEC-001',
    ]));

    $response->assertStatus(200);
    $response->assertInertia(function (Assert $page) use ($invoice) {
        $data = $page->toArray()['props']['invoices']['data'];
        expect($data)->toHaveCount(1);
        expect($data[0]['id'])->toEqual($invoice->id);
    });
});

test('invoice listing search by specimen sequence code finds specimen group invoice', function () {
    $groupInvoice = Invoice::create([
        'invoice_number' => '00000002',
        'full_invoice_number' => '000-001-01-00000002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 200.00,
        'discount' => 0.00,
        'subtotal' => 200.00,
        'total' => 200.00,
        'is_group' => true,
        'invoice_type' => 'specimen',
        'invoice_file' => 'invoice_2.pdf',
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Test Group',
        'invoice_id' => $groupInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'token_group_123',
    ]);
    $groupInvoice->update(['group_id' => $group->id]);

    $groupSpecimen = Specimen::create([
        'sequence_code' => 'GROUP-SPEC-999',
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

    InvoiceGroupSpecimen::create([
        'invoice_id' => $groupInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $groupSpecimen->id,
        'quantity' => 1,
        'amount' => 100,
        'total' => 100,
    ]);

    $response = $this->actingAs($this->user)->get(route('invoices.index', [
        'search' => 'GROUP-SPEC-999',
    ]));

    $response->assertStatus(200);
    $response->assertInertia(function (Assert $page) use ($groupInvoice) {
        $data = $page->toArray()['props']['invoices']['data'];
        expect($data)->toHaveCount(1);
        expect($data[0]['id'])->toEqual($groupInvoice->id);
    });
});
