<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\InvoicePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $viewPermission = Permission::create(['slug' => 'invoices.view', 'name' => 'Ver Facturas']);
    $this->adminRole->permissions()->attach($viewPermission);

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
    $this->type = SpecimenType::create(['name' => 'BIO', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Examen Simple',
        'code' => 'EX1',
    ]);

    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);

    $this->sequence = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->type->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => now()->format('m'),
        'year' => now()->format('Y'),
        'current_sequence' => 1,
        'active' => true,
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => '123-456-789',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2028-12-31',
        'status' => 'active',
    ]);
});

test('assigns invoice_date when creating a specimen invoice with non-credit payment type', function () {
    // Mock PDF service to avoid Puppeteer running
    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->once();
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    $response = $this->actingAs($this->user)->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'payment_type' => 'cash',
    ]);

    $response->assertRedirect();

    $newInvoice = Invoice::latest('id')->first();
    expect($newInvoice)->not->toBeNull();
    expect($newInvoice->payment_type)->toEqual('cash');
    expect($newInvoice->full_invoice_number)->not->toBeNull();
    expect($newInvoice->invoice_date)->not->toBeNull();
    expect($newInvoice->invoice_date->isToday())->toBeTrue();
});

test('does not assign invoice_date when creating a credit specimen invoice', function () {
    // Mock PDF service to avoid Puppeteer running
    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->once();
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    $response = $this->actingAs($this->user)->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'payment_type' => 'credit',
    ]);

    $response->assertRedirect();

    $newInvoice = Invoice::latest('id')->first();
    expect($newInvoice)->not->toBeNull();
    expect($newInvoice->payment_type)->toEqual('credit');
    expect($newInvoice->invoice_date)->toBeNull();
});
