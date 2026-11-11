<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
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
    $this->role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create([
        'name' => 'Test Customer',
        'id_number' => '0801-1990-12345',
    ]);

    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'General',
        'quantity' => 1,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#3b82f6',
        'order' => 1,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Tipo', 'active' => true]);
    $this->referrer = Referrer::create([
        'name' => 'Dr. House',
        'active' => true,
        'referrer_type' => $this->referrerType->id,
    ]);

    Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'last_number' => 0,
    ]);

    $this->bank = Bank::create([
        'name' => 'Banco Atlántida',
    ]);

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
        'deadline' => '2027-12-31',
        'status' => 'active',
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Biopsia Simple',
        'specimen_type' => $this->specimenType->name,
        'specimen_type_id' => $this->specimenType->id,
        'active' => true,
    ]);

    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->andReturn('invoices/test.pdf');
    app()->instance(InvoicePdfService::class, $pdfServiceMock);
});

test('specimen can be registered with mixed payments and creates invoice_payments lines', function () {
    $response = $this->actingAs($this->user)->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'quantity' => 1,
        'amount' => 1000.00,
        'discount' => 0.00, // subtotal = 1000.00
        'payment_type' => 'mixed',
        'payments' => [
            [
                'payment_method' => 'cash',
                'amount' => 400.00,
            ],
            [
                'payment_method' => 'bank transfer',
                'amount' => 600.00,
                'transfer_bank_id' => $this->bank->id,
                'transfer_authorization_code' => 'TX-MIXED-456',
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $invoice = Invoice::latest('id')->first();

    expect($invoice)->not->toBeNull()
        ->and($invoice->payment_type)->toBe('mixed')
        ->and($invoice->total)->toEqual(1000.00)
        ->and($invoice->total_paid)->toEqual(1000.00)
        ->and($invoice->payments)->toHaveCount(2)
        ->and((float) $invoice->payments->where('payment_method', 'cash')->first()->amount)->toEqual(400.00)
        ->and((float) $invoice->payments->where('payment_method', 'bank transfer')->first()->amount)->toEqual(600.00);
});

test('specimen mixed payments fail validation if payment sum does not equal subtotal', function () {
    $response = $this->actingAs($this->user)->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'amount' => 1000.00,
        'discount' => 0.00, // subtotal = 1000.00
        'quantity' => 1,
        'payment_type' => 'mixed',
        'payments' => [
            [
                'payment_method' => 'cash',
                'amount' => 400.00,
            ],
            [
                'payment_method' => 'bank transfer',
                'amount' => 500.00, // Sum = 900 != 1000
            ],
        ],
    ]);

    $response->assertSessionHasErrors('payments');
});
