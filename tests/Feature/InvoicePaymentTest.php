<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Location;
use App\Models\User;
use App\Services\InvoicePaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
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

    $this->customer = Customer::factory()->create([
        'name' => 'Juan Pérez',
        'id_number' => '0801-1990-12345',
    ]);

    $this->bank = Bank::create([
        'name' => 'Banco Ficohsa',
    ]);

    $this->user = User::factory()->create();
});

test('invoice can have payment_type mixed and associate multiple invoice_payments', function () {
    $invoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'mixed',
        'created_by_id' => $this->user->id,
        'quantity' => 1,
        'amount' => 1500.00,
        'discount' => 0.00,
        'subtotal' => 1500.00,
        'total' => 1500.00,
        'total_paid' => 1500.00,
        'invoice_file' => '',
        'invoice_date' => now(),
    ]);

    expect($invoice->isMixed())->toBeTrue();

    // Payment 1: Cash L. 500
    $payment1 = InvoicePayment::create([
        'invoice_id' => $invoice->id,
        'payment_method' => 'cash',
        'amount' => 500.00,
        'payment_date' => now()->toDateString(),
        'created_by_id' => $this->user->id,
    ]);

    // Payment 2: Bank transfer L. 1000
    $payment2 = InvoicePayment::create([
        'invoice_id' => $invoice->id,
        'payment_method' => 'bank transfer',
        'amount' => 1000.00,
        'payment_date' => now()->toDateString(),
        'transfer_bank_id' => $this->bank->id,
        'transfer_authorization_code' => 'TX-987654',
        'created_by_id' => $this->user->id,
    ]);

    $invoice->refresh();

    expect($invoice->payments)->toHaveCount(2)
        ->and($invoice->payments->sum('amount'))->toEqual(1500.00)
        ->and($payment2->transferBank->id)->toBe($this->bank->id)
        ->and($payment1->invoice->id)->toBe($invoice->id);
});

test('invoice payment service stores proof of payment upload for mixed payment lines', function () {
    Storage::fake('public');

    $invoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000002',
        'invoice_number' => '00000002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'mixed',
        'created_by_id' => $this->user->id,
        'quantity' => 1,
        'amount' => 2000.00,
        'discount' => 0.00,
        'subtotal' => 2000.00,
        'total' => 2000.00,
        'total_paid' => 2000.00,
        'invoice_file' => '',
        'invoice_date' => now(),
    ]);

    $fakeFile = UploadedFile::fake()->create('transfer_receipt.pdf', 300, 'application/pdf');

    $payments = [
        [
            'payment_method' => 'cash',
            'amount' => '800.00',
        ],
        [
            'payment_method' => 'bank transfer',
            'amount' => '1200.00',
            'transfer_bank_id' => $this->bank->id,
            'transfer_authorization_code' => 'AUTH12345',
            'proof_of_payment' => $fakeFile,
        ],
    ];

    InvoicePaymentService::savePayments($invoice, $payments);

    $invoice->refresh();

    expect($invoice->payments)->toHaveCount(2);

    $transferPayment = $invoice->payments->where('payment_method', 'bank transfer')->first();
    expect($transferPayment)->not->toBeNull()
        ->and($transferPayment->proof_of_payment)->not->toBeNull()
        ->and(Storage::disk('public')->exists($transferPayment->proof_of_payment))->toBeTrue();
});
