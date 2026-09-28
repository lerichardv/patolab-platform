<?php

use App\Models\Credit;
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

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);
    $this->actingAs($this->user);

    $this->customer = Customer::create([
        'name' => 'Hospital Principal',
        'id_number' => '0801199011111',
        'phone' => '99991111',
        'type' => 'empresa',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Clinica', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Jones', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Examen Simple',
        'code' => 'EX1',
    ]);
});

test('returns merge-data endpoint with group details, specimens, invoice and credit', function () {
    $targetInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'full_invoice_number' => '000-001-01-00010001',
        'invoice_number' => '00010001',
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'total_paid' => 0.00,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $targetGroup = SpecimenGroup::create([
        'name' => 'Hospital Principal - 2 Muestras',
        'customer_id' => $this->customer->id,
        'invoice_id' => $targetInvoice->id,
    ]);
    $targetInvoice->update(['group_id' => $targetGroup->id]);

    $spec = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $targetGroup->id,
    ]);

    $response = $this->getJson(route('specimen-groups.merge-data', $targetGroup));

    $response->assertOk()
        ->assertJsonPath('id', $targetGroup->id)
        ->assertJsonPath('name', 'Hospital Principal - 2 Muestras')
        ->assertJsonPath('customer.name', 'Hospital Principal')
        ->assertJsonPath('specimens_count', 1)
        ->assertJsonPath('invoice.full_invoice_number', '000-001-01-00010001')
        ->assertJsonPath('invoice.has_invoice_number', true);
});

test('searches merge candidates excluding current target group', function () {
    $inv1 = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 100,
        'subtotal' => 100,
        'total' => 100,
        'total_paid' => 0,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $targetGroup = SpecimenGroup::create([
        'name' => 'Grupo Destino',
        'customer_id' => $this->customer->id,
        'invoice_id' => $inv1->id,
    ]);

    $inv2 = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 100,
        'subtotal' => 100,
        'total' => 100,
        'total_paid' => 0,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $candidateGroup = SpecimenGroup::create([
        'name' => 'Grupo Origen Extraido',
        'customer_id' => $this->customer->id,
        'invoice_id' => $inv2->id,
    ]);

    $response = $this->getJson(route('specimen-groups.search-merge-candidates', [
        'exclude_id' => $targetGroup->id,
        'q' => 'Extraido',
    ]));

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($candidateGroup->id);
});

test('merges origin group into target group and deletes empty invoice and origin group', function () {
    // 1. Target Group (Has invoice number)
    $targetInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'full_invoice_number' => '000-001-01-00010001',
        'invoice_number' => '00010001',
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'exempt_amount' => 600.00,
        'total' => 600.00,
        'total_paid' => 100.00,
        'quantity' => 2,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $targetCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 600.00,
        'amount_paid' => 100.00,
        'amount_remaining' => 500.00,
        'is_group' => true,
        'status' => 'pending',
    ]);
    $targetInvoice->update(['credit_payment_id' => $targetCredit->id]);

    $targetGroup = SpecimenGroup::create([
        'name' => 'Hospital Principal - 2 Muestras',
        'customer_id' => $this->customer->id,
        'invoice_id' => $targetInvoice->id,
    ]);
    $targetInvoice->update(['group_id' => $targetGroup->id]);
    $targetCredit->update(['group_id' => $targetGroup->id]);

    $targetSpec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $targetGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $targetInvoice->id,
        'credit_id' => $targetCredit->id,
        'group_id' => $targetGroup->id,
        'specimen_id' => $targetSpec1->id,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'exempt_amount' => 300.00,
        'total' => 300.00,
    ]);

    $targetSpec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $targetGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $targetInvoice->id,
        'credit_id' => $targetCredit->id,
        'group_id' => $targetGroup->id,
        'specimen_id' => $targetSpec2->id,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'exempt_amount' => 300.00,
        'total' => 300.00,
    ]);

    // 2. Origin Group (No invoice number - draft/extracted)
    $originInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'full_invoice_number' => null,
        'invoice_number' => null,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'exempt_amount' => 300.00,
        'total' => 300.00,
        'total_paid' => 50.00,
        'quantity' => 1,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $originCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 300.00,
        'amount_paid' => 50.00,
        'amount_remaining' => 250.00,
        'is_group' => true,
        'status' => 'pending',
    ]);
    $originInvoice->update(['credit_payment_id' => $originCredit->id]);

    $originGroup = SpecimenGroup::create([
        'name' => 'Hospital Principal - 1 Muestra',
        'customer_id' => $this->customer->id,
        'invoice_id' => $originInvoice->id,
    ]);
    $originInvoice->update(['group_id' => $originGroup->id]);
    $originCredit->update(['group_id' => $originGroup->id]);

    $originSpec = Specimen::create([
        'sequence_code' => 'BIO-0003-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $originGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $originInvoice->id,
        'credit_id' => $originCredit->id,
        'group_id' => $originGroup->id,
        'specimen_id' => $originSpec->id,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'exempt_amount' => 300.00,
        'total' => 300.00,
    ]);

    // 3. Perform Merge
    $response = $this->post(route('specimen-groups.merge', $targetGroup), [
        'origin_group_id' => $originGroup->id,
    ]);

    $response->assertSessionHas('success');

    // 4. Assert Specimen moved
    expect((int) Specimen::find($originSpec->id)->group_id)->toBe($targetGroup->id);
    expect(Specimen::where('group_id', $targetGroup->id)->count())->toBe(3);

    // 5. Assert InvoiceSpecimen re-linked
    $movedIgs = InvoiceSpecimen::where('specimen_id', $originSpec->id)->first();
    expect($movedIgs->group_id)->toBe($targetGroup->id);
    expect($movedIgs->invoice_id)->toBe($targetInvoice->id);
    expect($movedIgs->credit_id)->toBe($targetCredit->id);

    // 6. Assert Surviving Invoice recalculated & Empty Invoice deleted
    $targetInvoice->refresh();
    expect((float) $targetInvoice->total)->toBe(900.00);
    expect((float) $targetInvoice->total_paid)->toBe(150.00); // 100 + 50
    expect($targetInvoice->quantity)->toBe(3);
    expect(Invoice::find($originInvoice->id))->toBeNull(); // deleted!

    // 7. Assert Credit reconciled & Empty Credit deleted
    $targetCredit->refresh();
    expect((float) $targetCredit->credit_amount)->toBe(900.00);
    expect((float) $targetCredit->amount_paid)->toBe(150.00);
    expect((float) $targetCredit->amount_remaining)->toBe(750.00);
    expect(Credit::find($originCredit->id))->toBeNull(); // deleted!

    // 8. Assert Origin Group deleted & Target Group renamed
    expect(SpecimenGroup::find($originGroup->id))->toBeNull();
    $targetGroup->refresh();
    expect($targetGroup->name)->toBe('Hospital Principal - 3 Muestras');
});

test('when both groups have invoice numbers user selection is honored', function () {
    // Target has invoice 00010001
    $targetInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'full_invoice_number' => '000-001-01-00010001',
        'invoice_number' => '00010001',
        'amount' => 500.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'quantity' => 1,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $targetGroup = SpecimenGroup::create([
        'name' => 'Grupo Destino',
        'customer_id' => $this->customer->id,
        'invoice_id' => $targetInvoice->id,
    ]);
    $targetInvoice->update(['group_id' => $targetGroup->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $targetGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $targetInvoice->id,
        'group_id' => $targetGroup->id,
        'specimen_id' => $spec1->id,
        'quantity' => 1,
        'amount' => 500.00,
        'subtotal' => 500.00,
        'total' => 500.00,
    ]);

    // Origin has invoice 00010002
    $originInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'full_invoice_number' => '000-001-01-00010002',
        'invoice_number' => '00010002',
        'amount' => 500.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'quantity' => 1,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $originGroup = SpecimenGroup::create([
        'name' => 'Grupo Origen',
        'customer_id' => $this->customer->id,
        'invoice_id' => $originInvoice->id,
    ]);
    $originInvoice->update(['group_id' => $originGroup->id]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $originGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $originInvoice->id,
        'group_id' => $originGroup->id,
        'specimen_id' => $spec2->id,
        'quantity' => 1,
        'amount' => 500.00,
        'subtotal' => 500.00,
        'total' => 500.00,
    ]);

    // Select to keep ORIGIN's invoice!
    $response = $this->post(route('specimen-groups.merge', $targetGroup), [
        'origin_group_id' => $originGroup->id,
        'target_invoice_id' => $originInvoice->id,
    ]);

    $response->assertSessionHas('success');

    // Origin invoice survived and is attached to target group
    $surviving = Invoice::find($originInvoice->id);
    expect($surviving)->not->toBeNull();
    expect($surviving->full_invoice_number)->toBe('000-001-01-00010002');
    expect((float) $surviving->total)->toBe(1000.00);

    // Empty target invoice was deleted
    expect(Invoice::find($targetInvoice->id))->toBeNull();

    // Target group now points to surviving invoice
    $targetGroup->refresh();
    expect($targetGroup->invoice_id)->toBe($originInvoice->id);
});

test('cannot merge group into itself', function () {
    $inv = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 100,
        'subtotal' => 100,
        'total' => 100,
        'total_paid' => 0,
        'is_group' => true,
        'invoice_file' => '',
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Grupo Mismo',
        'customer_id' => $this->customer->id,
        'invoice_id' => $inv->id,
    ]);

    $response = $this->post(route('specimen-groups.merge', $group), [
        'origin_group_id' => $group->id,
    ]);

    $response->assertSessionHasErrors('origin_group_id');
});

test('cannot merge credit group with non-credit group', function () {
    $creditInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 300,
        'subtotal' => 300,
        'total' => 300,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $targetCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 300,
        'amount_paid' => 0,
        'amount_remaining' => 300,
        'is_group' => true,
        'status' => 'pending',
    ]);
    $creditInvoice->update(['credit_payment_id' => $targetCredit->id]);

    $creditGroup = SpecimenGroup::create([
        'name' => 'Grupo Crédito',
        'customer_id' => $this->customer->id,
        'invoice_id' => $creditInvoice->id,
    ]);
    $creditInvoice->update(['group_id' => $creditGroup->id]);
    $targetCredit->update(['group_id' => $creditGroup->id]);

    Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $creditGroup->id,
    ]);

    // Non-credit group (cash)
    $cashInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'amount' => 300,
        'subtotal' => 300,
        'total' => 300,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $cashGroup = SpecimenGroup::create([
        'name' => 'Grupo Contado',
        'customer_id' => $this->customer->id,
        'invoice_id' => $cashInvoice->id,
    ]);
    $cashInvoice->update(['group_id' => $cashGroup->id]);

    Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $cashGroup->id,
    ]);

    // Try merging cash into credit
    $response = $this->post(route('specimen-groups.merge', $creditGroup), [
        'origin_group_id' => $cashGroup->id,
    ]);

    $response->assertSessionHasErrors('origin_group_id');

    // Try merging credit into cash
    $response2 = $this->post(route('specimen-groups.merge', $cashGroup), [
        'origin_group_id' => $creditGroup->id,
    ]);

    $response2->assertSessionHasErrors('origin_group_id');
});

test('when both groups have credits user selection of conserved credit is honored', function () {
    $targetInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 400.00,
        'subtotal' => 400.00,
        'total' => 400.00,
        'total_paid' => 100.00,
        'quantity' => 1,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $targetCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 400.00,
        'amount_paid' => 100.00,
        'amount_remaining' => 300.00,
        'is_group' => true,
        'status' => 'pending',
    ]);
    $targetInvoice->update(['credit_payment_id' => $targetCredit->id]);

    $targetGroup = SpecimenGroup::create([
        'name' => 'Grupo Destino Crédito',
        'customer_id' => $this->customer->id,
        'invoice_id' => $targetInvoice->id,
    ]);
    $targetInvoice->update(['group_id' => $targetGroup->id]);
    $targetCredit->update(['group_id' => $targetGroup->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $targetGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $targetInvoice->id,
        'credit_id' => $targetCredit->id,
        'group_id' => $targetGroup->id,
        'specimen_id' => $spec1->id,
        'quantity' => 1,
        'amount' => 400.00,
        'subtotal' => 400.00,
        'total' => 400.00,
    ]);

    $originInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'total_paid' => 200.00,
        'quantity' => 1,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $originCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 600.00,
        'amount_paid' => 200.00,
        'amount_remaining' => 400.00,
        'is_group' => true,
        'status' => 'pending',
    ]);
    $originInvoice->update(['credit_payment_id' => $originCredit->id]);

    $originGroup = SpecimenGroup::create([
        'name' => 'Grupo Origen Crédito',
        'customer_id' => $this->customer->id,
        'invoice_id' => $originInvoice->id,
    ]);
    $originInvoice->update(['group_id' => $originGroup->id]);
    $originCredit->update(['group_id' => $originGroup->id]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $originGroup->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $originInvoice->id,
        'credit_id' => $originCredit->id,
        'group_id' => $originGroup->id,
        'specimen_id' => $spec2->id,
        'quantity' => 1,
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
    ]);

    // Choose to CONSERVE ORIGIN's credit
    $response = $this->post(route('specimen-groups.merge', $targetGroup), [
        'origin_group_id' => $originGroup->id,
        'target_credit_id' => $originCredit->id,
    ]);

    $response->assertSessionHas('success');

    // Origin credit survived and is attached to targetGroup
    $survivingCredit = Credit::find($originCredit->id);
    expect($survivingCredit)->not->toBeNull();
    expect((int) $survivingCredit->group_id)->toBe($targetGroup->id);
    expect((float) $survivingCredit->credit_amount)->toBe(1000.00);
    expect((float) $survivingCredit->amount_paid)->toBe(300.00); // 100 + 200
    expect((float) $survivingCredit->amount_remaining)->toBe(700.00);

    // Target credit dissolved and deleted
    expect(Credit::find($targetCredit->id))->toBeNull();

    // Surviving invoice points to surviving credit
    $targetInvoice->refresh();
    expect($targetInvoice->credit_payment_id)->toBe($originCredit->id);
});

test('candidate search returns all candidates with has_credit and is_compatible flags', function () {
    $targetInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'amount' => 100,
        'subtotal' => 100,
        'total' => 100,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $targetGroup = SpecimenGroup::create([
        'name' => 'Target Cash Group',
        'customer_id' => $this->customer->id,
        'invoice_id' => $targetInvoice->id,
    ]);

    // Candidate 1: Cash (compatible)
    $cand1Invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'amount' => 100,
        'subtotal' => 100,
        'total' => 100,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $cand1 = SpecimenGroup::create([
        'name' => 'Candidate Cash',
        'customer_id' => $this->customer->id,
        'invoice_id' => $cand1Invoice->id,
    ]);

    // Candidate 2: Credit (incompatible because target is cash)
    $cand2Invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'amount' => 100,
        'subtotal' => 100,
        'total' => 100,
        'is_group' => true,
        'invoice_file' => '',
    ]);
    $cand2Credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 100,
        'amount_paid' => 0,
        'amount_remaining' => 100,
        'is_group' => true,
        'status' => 'pending',
    ]);
    $cand2Invoice->update(['credit_payment_id' => $cand2Credit->id]);
    $cand2 = SpecimenGroup::create([
        'name' => 'Candidate Credit',
        'customer_id' => $this->customer->id,
        'invoice_id' => $cand2Invoice->id,
    ]);
    $cand2Credit->update(['group_id' => $cand2->id]);

    $response = $this->getJson(route('specimen-groups.search-merge-candidates', [
        'exclude_id' => $targetGroup->id,
    ]));

    $response->assertOk();
    $data = collect($response->json('data'));

    $c1 = $data->firstWhere('id', $cand1->id);
    expect($c1['has_credit'])->toBeFalse();
    expect($c1['is_compatible'])->toBeTrue();

    $c2 = $data->firstWhere('id', $cand2->id);
    expect($c2['has_credit'])->toBeTrue();
    expect($c2['is_compatible'])->toBeFalse();
});
