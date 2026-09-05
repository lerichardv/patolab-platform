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
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');

    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    Gate::define('specimen-groups.view', fn () => true);
    Gate::define('specimen-groups.create', fn () => true);

    $this->customer = Customer::factory()->create(['name' => 'Clinica Ogyne']);
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->specimenType = SpecimenType::create(['name' => 'Citologia Liquida', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Analisis 1',
        'code' => 'CXL1',
        'active' => true,
    ]);
    $this->examination->prices()->create(['amount' => 220.00]);

    $this->sequence = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'CXL',
        'separator' => '-',
        'fill' => 4,
        'current_sequence' => 1,
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

test('adds a specimen to a group with 35 existing specimens and attaches medical order file', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 35 * 220.00,
        'amount_paid' => 0,
        'amount_remaining' => 35 * 220.00,
        'is_group' => true,
    ]);

    $invoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000021',
        'invoice_number' => '00000021',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'quantity' => 35,
        'amount' => 35 * 220.00,
        'subtotal' => 35 * 220.00,
        'total' => 35 * 220.00,
        'total_paid' => 0,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Clinica Ogyne - 35 Muestras',
        'invoice_id' => $invoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => 'token21',
    ]);
    $invoice->update(['group_id' => $group->id]);
    $credit->update(['group_id' => $group->id]);

    // Create 35 existing specimens
    $specimensPayload = [];
    for ($i = 1; $i <= 35; $i++) {
        $patient = Customer::factory()->create(['name' => "Paciente {$i}"]);
        $spec = Specimen::create([
            'sequence_code' => "CXL-000{$i}-08-2026",
            'customer' => $patient->id,
            'specimen_type' => $this->specimenType->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'status' => 'received',
            'priority_id' => $this->priority->id,
            'is_group' => true,
            'group_id' => $group->id,
        ]);

        InvoiceSpecimen::create([
            'invoice_id' => $invoice->id,
            'specimen_id' => $spec->id,
            'examination_id' => $this->examination->id,
            'is_group' => true,
            'group_id' => $group->id,
            'credit_id' => $credit->id,
            'quantity' => 1,
            'amount' => 220.00,
            'discount' => 0.00,
            'subtotal' => 220.00,
            'total' => 220.00,
            'selected_price' => '220.00',
        ]);

        $specimensPayload[] = [
            'id' => $spec->id,
            'customer' => $patient->id,
            'specimen_type' => $this->specimenType->id,
            'specimen_type_examination' => (string) $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'status' => 'received',
            'priority_id' => $this->priority->id,
            'selected_price' => '220.00',
            'quantity' => 1,
            'examinations' => [
                [
                    'examination_id' => $this->examination->id,
                    'quantity' => 1,
                    'selected_price' => '220.00',
                ],
            ],
            'insumos' => [],
        ];
    }

    // New 36th specimen: Sandra Etelvina Mencia Hernandez
    $sandra = Customer::factory()->create(['name' => 'Sandra Etelvina Mencia Hernandez']);
    $file = UploadedFile::fake()->create('orden_medica.pdf', 200, 'application/pdf');

    $specimensPayload[] = [
        'customer' => $sandra->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => (string) $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'sample_collection_date' => '2026-08-29',
        'selected_price' => '220.00',
        'quantity' => 1,
        'examinations' => [
            [
                'examination_id' => $this->examination->id,
                'quantity' => 1,
                'selected_price' => '220.00',
            ],
        ],
        'insumos' => [],
    ];

    $response = $this->actingAs($this->user)->post(route('specimen-groups.add-specimens', $group), [
        'payment_type' => 'credit',
        'specimens' => $specimensPayload,
        'specimens.35.medical_order_file' => $file,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    // Verify 36th specimen is created in DB
    $newSpec = Specimen::where('customer', $sandra->id)->where('group_id', $group->id)->first();
    expect($newSpec)->not->toBeNull();
    expect($newSpec->sample_collection_date)->not->toBeNull();
    expect($newSpec->medical_order_file)->not->toBeNull();

    // Verify group count updated to 36
    $group->refresh();
    expect($group->specimens()->count())->toBe(36);
    expect($group->name)->toContain('36 Muestras');

    // Verify invoice and credit updated
    $invoice->refresh();
    expect((int) $invoice->quantity)->toBe(36);
    expect((float) $invoice->total)->toBe(36 * 220.00);

    $credit->refresh();
    expect((float) $credit->credit_amount)->toBe(36 * 220.00);
});
