<?php

use App\Models\Bank;
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
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->bank = Bank::create(['name' => 'BAC Credomatic']);
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $managePermission = Permission::create(['slug' => 'credits.manage', 'name' => 'Gestionar Créditos']);
    $this->adminRole->permissions()->attach($managePermission);

    $this->customer = Customer::create([
        'name' => 'Hospital San Pedro',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'otro',
        'type' => 'company',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Tipo', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. House', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'BIO', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Biopsia Simple',
        'code' => 'EX1',
    ]);

    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
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

test('extracting a single specimen creates a new SpecimenGroup with original customer group and updates original group', function () {
    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'amount' => 900.00,
        'discount' => 0.00,
        'subtotal' => 900.00,
        'exempt_amount' => 900.00,
        'tax_exempt_amount' => 900.00,
        'total' => 900.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/test.pdf',
        'is_group' => true,
        'quantity' => 3,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 3 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 900.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 900.00,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $originalInvoice->update(['credit_payment_id' => $credit->id]);

    $specimens = [];
    for ($i = 1; $i <= 3; $i++) {
        $spec = Specimen::create([
            'sequence_code' => "BIO-000{$i}-08-2026",
            'customer' => $this->customer->id,
            'specimen_type' => $this->type->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'status' => 'received',
            'priority_id' => $this->priority->id,
            'is_group' => true,
            'group_id' => $group->id,
        ]);

        InvoiceGroupSpecimen::create([
            'invoice_id' => $originalInvoice->id,
            'group_id' => $group->id,
            'specimen_id' => $spec->id,
            'quantity' => 1,
            'amount' => 300.00,
            'discount' => 0.00,
            'subtotal' => 300.00,
            'exempt_amount' => 300.00,
            'total' => 300.00,
            'selected_price' => '300.00',
        ]);

        CreditInvoiceSpecimen::create([
            'credit_id' => $credit->id,
            'invoice_id' => $originalInvoice->id,
            'specimen_id' => $spec->id,
            'is_paid' => 0,
            'quantity' => 1,
            'quantity_paid' => 0,
            'amount' => 300.00,
            'discount' => 0.00,
            'subtotal' => 300.00,
            'exempt_amount' => 300.00,
            'total' => 300.00,
            'selected_price' => '300.00',
        ]);

        $specimens[] = $spec;
    }

    $extractedSpecimen = $specimens[0];

    $response = $this->actingAs($this->user)
        ->post(route('credits.extract-specimens', $credit->id), [
            'specimen_ids' => [$extractedSpecimen->id],
            'is_social_security' => false,
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $newGroup = SpecimenGroup::where('id', '!=', $group->id)->first();
    expect($newGroup)->not->toBeNull()
        ->and($newGroup->name)->toBe('Hospital San Pedro - 1 Muestra')
        ->and($newGroup->customer_id)->toBe($this->customer->id);

    $extractedSpecimen->refresh();
    expect($extractedSpecimen->is_group)->toBeTrue()
        ->and((int) $extractedSpecimen->group_id)->toBe($newGroup->id);

    $newCredit = Credit::where('group_id', $newGroup->id)->first();
    expect($newCredit)->not->toBeNull()
        ->and($newCredit->is_group)->toBeTrue()
        ->and($newCredit->customer_id)->toBe($this->customer->id)
        ->and($newCredit->specimen_id)->toBeNull()
        ->and((float) $newCredit->credit_amount)->toBe(300.00)
        ->and((float) $newCredit->amount_remaining)->toBe(300.00)
        ->and((float) $newCredit->amount_paid)->toBe(0.00);

    $newInvoice = Invoice::where('group_id', $newGroup->id)->first();
    expect($newInvoice)->not->toBeNull()
        ->and($newInvoice->is_group)->toBeTrue()
        ->and($newInvoice->customer_id)->toBe($this->customer->id)
        ->and($newInvoice->specimen_id)->toBeNull()
        ->and($newInvoice->credit_payment_id)->toBe($newCredit->id)
        ->and($newInvoice->full_invoice_number)->toBeNull()
        ->and($newInvoice->invoice_number)->toBeNull()
        ->and($newInvoice->cai_range_id)->toBeNull()
        ->and((float) $newInvoice->total)->toBe(300.00)
        ->and((int) $newInvoice->quantity)->toBe(1);

    expect(InvoiceGroupSpecimen::where('invoice_id', $originalInvoice->id)->where('specimen_id', $extractedSpecimen->id)->exists())->toBeFalse()
        ->and(CreditInvoiceSpecimen::where('credit_id', $credit->id)->where('specimen_id', $extractedSpecimen->id)->exists())->toBeFalse()
        ->and(InvoiceGroupSpecimen::where('group_id', $newGroup->id)->where('specimen_id', $extractedSpecimen->id)->exists())->toBeTrue()
        ->and(CreditInvoiceSpecimen::where('credit_id', $newCredit->id)->where('specimen_id', $extractedSpecimen->id)->exists())->toBeTrue();

    $originalInvoice->refresh();
    expect((float) $originalInvoice->amount)->toBe(600.00)
        ->and((float) $originalInvoice->subtotal)->toBe(600.00)
        ->and((float) $originalInvoice->total)->toBe(600.00)
        ->and((int) $originalInvoice->quantity)->toBe(2);

    $credit->refresh();
    expect((float) $credit->credit_amount)->toBe(600.00)
        ->and((float) $credit->amount_remaining)->toBe(600.00);

    $group->refresh();
    expect($group->name)->toBe('Hospital San Pedro - 2 Muestras');
});

test('extracting a single specimen with para seguro creates a SpecimenGroup with CAI invoice number', function () {
    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'exempt_amount' => 500.00,
        'tax_exempt_amount' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/test.pdf',
        'is_group' => true,
        'quantity' => 2,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 2 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $originalInvoice->update(['credit_payment_id' => $credit->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    InvoiceGroupSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec1->id,
        'quantity' => 1,
        'amount' => 250.00,
        'discount' => 0.00,
        'subtotal' => 250.00,
        'exempt_amount' => 250.00,
        'total' => 250.00,
        'selected_price' => '250.00',
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $spec1->id,
        'is_paid' => 0,
        'quantity' => 1,
        'quantity_paid' => 0,
        'amount' => 250.00,
        'discount' => 0.00,
        'subtotal' => 250.00,
        'exempt_amount' => 250.00,
        'total' => 250.00,
        'selected_price' => '250.00',
    ]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    InvoiceGroupSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec2->id,
        'quantity' => 1,
        'amount' => 250.00,
        'discount' => 0.00,
        'subtotal' => 250.00,
        'exempt_amount' => 250.00,
        'total' => 250.00,
        'selected_price' => '250.00',
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $spec2->id,
        'is_paid' => 0,
        'quantity' => 1,
        'quantity_paid' => 0,
        'amount' => 250.00,
        'discount' => 0.00,
        'subtotal' => 250.00,
        'exempt_amount' => 250.00,
        'total' => 250.00,
        'selected_price' => '250.00',
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('credits.extract-specimens', $credit->id), [
            'specimen_ids' => [$spec1->id],
            'is_social_security' => true,
        ]);

    $response->assertRedirect();

    $newGroup = SpecimenGroup::where('id', '!=', $group->id)->first();
    expect($newGroup)->not->toBeNull()
        ->and($newGroup->name)->toBe('Hospital San Pedro - 1 Muestra')
        ->and($newGroup->customer_id)->toBe($this->customer->id);

    $newInvoice = Invoice::where('group_id', $newGroup->id)->first();
    expect($newInvoice)->not->toBeNull()
        ->and($newInvoice->is_group)->toBeTrue()
        ->and($newInvoice->full_invoice_number)->toBe('000-001-01-00000001')
        ->and($newInvoice->invoice_number)->toBe('00000001')
        ->and($newInvoice->cai_range_id)->toBe($this->caiRange->id)
        ->and($newInvoice->invoice_type)->toBe('social security')
        ->and($newInvoice->invoice_date)->not->toBeNull();

    $this->caiRange->refresh();
    expect($this->caiRange->last_used_number)->toBe(1);

    // Verify rendered PDF template contains PAGADO seal and not AL CRÉDITO
    $renderedHtml = view('pdf.invoice', [
        'invoice' => $newInvoice,
        'caiRange' => $this->caiRange,
        'customer' => $this->customer,
        'examination' => $this->examination,
        'location' => $this->location,
        'totalWords' => 'DOSCIENTOS CINCUENTA CON 00/100',
    ])->render();

    expect($renderedHtml)->toContain('PAGADO')
        ->and($renderedHtml)->not->toContain('AL CRÉDITO');
});

test('extracting multiple specimens creates a new SpecimenGroup with new credit and invoice', function () {
    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'amount' => 1200.00,
        'discount' => 0.00,
        'subtotal' => 1200.00,
        'exempt_amount' => 1200.00,
        'tax_exempt_amount' => 1200.00,
        'total' => 1200.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/test.pdf',
        'is_group' => true,
        'quantity' => 4,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 4 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 1200.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 1200.00,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $originalInvoice->update(['credit_payment_id' => $credit->id]);

    $specimens = [];
    for ($i = 1; $i <= 4; $i++) {
        $spec = Specimen::create([
            'sequence_code' => "BIO-000{$i}-08-2026",
            'customer' => $this->customer->id,
            'specimen_type' => $this->type->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'status' => 'received',
            'priority_id' => $this->priority->id,
            'is_group' => true,
            'group_id' => $group->id,
        ]);

        InvoiceGroupSpecimen::create([
            'invoice_id' => $originalInvoice->id,
            'group_id' => $group->id,
            'specimen_id' => $spec->id,
            'quantity' => 1,
            'amount' => 300.00,
            'discount' => 0.00,
            'subtotal' => 300.00,
            'exempt_amount' => 300.00,
            'total' => 300.00,
            'selected_price' => '300.00',
        ]);

        CreditInvoiceSpecimen::create([
            'credit_id' => $credit->id,
            'invoice_id' => $originalInvoice->id,
            'specimen_id' => $spec->id,
            'is_paid' => 0,
            'quantity' => 1,
            'quantity_paid' => 0,
            'amount' => 300.00,
            'discount' => 0.00,
            'subtotal' => 300.00,
            'exempt_amount' => 300.00,
            'total' => 300.00,
            'selected_price' => '300.00',
        ]);

        $specimens[] = $spec;
    }

    $response = $this->actingAs($this->user)
        ->post(route('credits.extract-specimens', $credit->id), [
            'specimen_ids' => [$specimens[0]->id, $specimens[1]->id],
            'is_social_security' => false,
        ]);

    $response->assertRedirect();

    $newGroup = SpecimenGroup::where('id', '!=', $group->id)->first();
    expect($newGroup)->not->toBeNull()
        ->and($newGroup->name)->toBe('Hospital San Pedro - 2 Muestras')
        ->and($newGroup->customer_id)->toBe($this->customer->id);

    $specimens[0]->refresh();
    $specimens[1]->refresh();
    expect((int) $specimens[0]->group_id)->toBe($newGroup->id)
        ->and((int) $specimens[1]->group_id)->toBe($newGroup->id)
        ->and($specimens[0]->is_group)->toBeTrue()
        ->and($specimens[1]->is_group)->toBeTrue();

    $newCredit = Credit::where('group_id', $newGroup->id)->first();
    expect($newCredit)->not->toBeNull()
        ->and($newCredit->is_group)->toBeTrue()
        ->and($newCredit->customer_id)->toBe($this->customer->id)
        ->and((float) $newCredit->credit_amount)->toBe(600.00)
        ->and((float) $newCredit->amount_remaining)->toBe(600.00);

    $newInvoice = Invoice::where('group_id', $newGroup->id)->first();
    expect($newInvoice)->not->toBeNull()
        ->and($newInvoice->is_group)->toBeTrue()
        ->and($newInvoice->customer_id)->toBe($this->customer->id)
        ->and((float) $newInvoice->total)->toBe(600.00)
        ->and((int) $newInvoice->quantity)->toBe(2);

    expect(InvoiceGroupSpecimen::where('group_id', $newGroup->id)->count())->toBe(2)
        ->and(CreditInvoiceSpecimen::where('credit_id', $newCredit->id)->count())->toBe(2);

    $originalInvoice->refresh();
    $credit->refresh();
    $group->refresh();
    expect((float) $originalInvoice->total)->toBe(600.00)
        ->and((float) $credit->credit_amount)->toBe(600.00)
        ->and($group->name)->toBe('Hospital San Pedro - 2 Muestras');
});

test('extracting specimens preserves individual specimen patient relation while assigning original group customer to the new SpecimenGroup', function () {
    $patient1 = Customer::create([
        'name' => 'Juan Perez (Paciente)',
        'id_number' => '0801199000001',
        'gender' => 'masculino',
        'type' => 'individual',
    ]);
    $patient2 = Customer::create([
        'name' => 'Maria Lopez (Paciente)',
        'id_number' => '0801199000002',
        'gender' => 'femenino',
        'type' => 'individual',
    ]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'amount' => 800.00,
        'discount' => 0.00,
        'subtotal' => 800.00,
        'exempt_amount' => 800.00,
        'tax_exempt_amount' => 800.00,
        'total' => 800.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/test.pdf',
        'is_group' => true,
        'quantity' => 2,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 2 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 800.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 800.00,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $originalInvoice->update(['credit_payment_id' => $credit->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $patient1->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    InvoiceGroupSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec1->id,
        'quantity' => 1,
        'amount' => 400.00,
        'discount' => 0.00,
        'subtotal' => 400.00,
        'exempt_amount' => 400.00,
        'total' => 400.00,
        'selected_price' => '400.00',
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $spec1->id,
        'is_paid' => 0,
        'quantity' => 1,
        'amount' => 400.00,
        'discount' => 0.00,
        'subtotal' => 400.00,
        'exempt_amount' => 400.00,
        'total' => 400.00,
        'selected_price' => '400.00',
    ]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $patient2->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    InvoiceGroupSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec2->id,
        'quantity' => 1,
        'amount' => 400.00,
        'discount' => 0.00,
        'subtotal' => 400.00,
        'exempt_amount' => 400.00,
        'total' => 400.00,
        'selected_price' => '400.00',
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $spec2->id,
        'is_paid' => 0,
        'quantity' => 1,
        'amount' => 400.00,
        'discount' => 0.00,
        'subtotal' => 400.00,
        'exempt_amount' => 400.00,
        'total' => 400.00,
        'selected_price' => '400.00',
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('credits.extract-specimens', $credit->id), [
            'specimen_ids' => [$spec1->id],
            'is_social_security' => false,
        ]);

    $response->assertRedirect();

    $newGroup = SpecimenGroup::where('id', '!=', $group->id)->first();
    expect($newGroup)->not->toBeNull()
        ->and($newGroup->customer_id)->toBe($this->customer->id);

    $spec1->refresh();
    // Specimen itself preserves its patient customer ID
    expect($spec1->customer)->toBe($patient1->id)
        ->and($spec1->is_group)->toBeTrue()
        ->and((int) $spec1->group_id)->toBe($newGroup->id);

    $newCredit = Credit::where('group_id', $newGroup->id)->first();
    // Credit and Invoice are assigned to the original group customer (Hospital)
    expect($newCredit->customer_id)->toBe($this->customer->id);

    $newInvoice = Invoice::where('group_id', $newGroup->id)->first();
    expect($newInvoice->customer_id)->toBe($this->customer->id);
});

test('cannot extract all specimens from group', function () {
    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/test.pdf',
        'is_group' => true,
        'quantity' => 2,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 2 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 600.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 600.00,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $originalInvoice->update(['group_id' => $group->id, 'credit_payment_id' => $credit->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $spec1->id,
        'is_paid' => 0,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'total' => 300.00,
    ]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    CreditInvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $spec2->id,
        'is_paid' => 0,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'total' => 300.00,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('credits.extract-specimens', $credit->id), [
            'specimen_ids' => [$spec1->id, $spec2->id],
            'is_social_security' => false,
        ]);

    $response->assertSessionHasErrors('specimen_ids');
});
