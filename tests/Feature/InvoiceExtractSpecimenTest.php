<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Product;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\InvoicePdfService;
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

    $managePermission = Permission::create(['slug' => 'invoices.manage', 'name' => 'Gestionar Facturas']);
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

test('user can extract a single specimen from a non-credit group invoice', function () {
    $pdfMock = Mockery::mock(InvoicePdfService::class);
    $pdfMock->shouldReceive('generateAndStoreInvoice')->twice()->andReturn('invoices/test.pdf');
    app()->instance(InvoicePdfService::class, $pdfMock);

    $originalInvoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'amount' => 900.00,
        'discount' => 0.00,
        'subtotal' => 900.00,
        'exempt_amount' => 900.00,
        'tax_exempt_amount' => 900.00,
        'total' => 900.00,
        'total_paid' => 900.00,
        'invoice_file' => 'invoices/original.pdf',
        'is_group' => true,
        'quantity' => 3,
    ]);
    $this->caiRange->update(['last_used_number' => 1]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 3 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $specimens = [];
    for ($i = 1; $i <= 3; $i++) {
        $spec = Specimen::create([
            'sequence_code' => "BIO-000{$i}-08-2026",
            'customer' => $this->customer->id,
            'specimen_type' => $this->type->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'status' => 'received',
            'priority_id' => $this->priority->id,
            'is_group' => true,
            'group_id' => $group->id,
        ]);

        InvoiceSpecimen::create([
            'invoice_id' => $originalInvoice->id,
            'group_id' => $group->id,
            'specimen_id' => $spec->id,
            'examination_id' => $this->examination->id,
            'quantity' => 1,
            'amount' => 300.00,
            'discount' => 0.00,
            'subtotal' => 300.00,
            'exempt_amount' => 300.00,
            'total' => 300.00,
            'selected_price' => '300.00',
            'is_paid' => true,
        ]);

        $specimens[] = $spec;
    }

    $specimenToExtract = $specimens[0];

    $response = $this->actingAs($this->user)
        ->post(route('invoices.extract-specimens', $originalInvoice->id), [
            'specimen_ids' => [$specimenToExtract->id],
            'invoice_date' => '2026-10-20',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Verify new invoice
    $newInvoice = Invoice::where('id', '!=', $originalInvoice->id)->latest('id')->first();
    expect($newInvoice)->not->toBeNull();
    expect($newInvoice->full_invoice_number)->toBe('000-001-01-00000002');
    expect($newInvoice->invoice_number)->toBe('00000002');
    expect($newInvoice->cai_range_id)->toBe($this->caiRange->id);
    expect((float) $newInvoice->total)->toBe(300.00);
    expect((float) $newInvoice->total_paid)->toBe(300.00);
    expect($newInvoice->payment_type)->toBe('cash');
    expect($newInvoice->is_group)->toBeTrue();
    expect($newInvoice->group_id)->not->toBeNull();

    // Verify new specimen group
    $newGroup = SpecimenGroup::find($newInvoice->group_id);
    expect($newGroup)->not->toBeNull();
    expect($newGroup->name)->toBe('Hospital San Pedro - 1 Muestra');

    // Verify extracted specimen reassignment
    $specimenToExtract->refresh();
    expect($specimenToExtract->group_id)->toBe($newGroup->id);
    expect($specimenToExtract->is_group)->toBeTrue();

    // Verify InvoiceSpecimen record reassignment
    $extractedItem = InvoiceSpecimen::where('specimen_id', $specimenToExtract->id)->first();
    expect($extractedItem->invoice_id)->toBe($newInvoice->id);
    expect($extractedItem->group_id)->toBe($newGroup->id);
    expect($extractedItem->is_paid)->toBeTrue();

    // Verify original invoice was recalculated
    $originalInvoice->refresh();
    expect((float) $originalInvoice->total)->toBe(600.00);
    expect((float) $originalInvoice->total_paid)->toBe(600.00);
    expect($originalInvoice->quantity)->toBe(2);

    // Verify original group name updated
    $group->refresh();
    expect($group->name)->toBe('Hospital San Pedro - 2 Muestras');
});

test('user can extract multiple specimens from group invoice', function () {
    $pdfMock = Mockery::mock(InvoicePdfService::class);
    $pdfMock->shouldReceive('generateAndStoreInvoice')->twice()->andReturn('invoices/test.pdf');
    app()->instance(InvoicePdfService::class, $pdfMock);

    $originalInvoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'card',
        'amount' => 900.00,
        'discount' => 0.00,
        'subtotal' => 900.00,
        'exempt_amount' => 900.00,
        'tax_exempt_amount' => 900.00,
        'total' => 900.00,
        'total_paid' => 900.00,
        'invoice_file' => 'invoices/original.pdf',
        'is_group' => true,
        'quantity' => 3,
    ]);
    $this->caiRange->update(['last_used_number' => 1]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 3 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $specimenIds = [];
    for ($i = 1; $i <= 3; $i++) {
        $spec = Specimen::create([
            'sequence_code' => "BIO-000{$i}-08-2026",
            'customer' => $this->customer->id,
            'specimen_type' => $this->type->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'status' => 'received',
            'priority_id' => $this->priority->id,
            'is_group' => true,
            'group_id' => $group->id,
        ]);

        InvoiceSpecimen::create([
            'invoice_id' => $originalInvoice->id,
            'group_id' => $group->id,
            'specimen_id' => $spec->id,
            'examination_id' => $this->examination->id,
            'quantity' => 1,
            'amount' => 300.00,
            'discount' => 0.00,
            'subtotal' => 300.00,
            'exempt_amount' => 300.00,
            'total' => 300.00,
            'selected_price' => '300.00',
            'is_paid' => true,
        ]);

        $specimenIds[] = $spec->id;
    }

    // Extract 2 specimens out of 3
    $response = $this->actingAs($this->user)
        ->post(route('invoices.extract-specimens', $originalInvoice->id), [
            'specimen_ids' => [$specimenIds[0], $specimenIds[1]],
            'invoice_date' => '2026-10-20',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $newInvoice = Invoice::where('id', '!=', $originalInvoice->id)->latest('id')->first();
    expect((float) $newInvoice->total)->toBe(600.00);
    expect($newInvoice->quantity)->toBe(2);

    $originalInvoice->refresh();
    expect((float) $originalInvoice->total)->toBe(300.00);
    expect($originalInvoice->quantity)->toBe(1);

    $group->refresh();
    expect($group->name)->toBe('Hospital San Pedro - 1 Muestra');
});

test('calculation matches InvoiceCalculationService with products and taxes', function () {
    $pdfMock = Mockery::mock(InvoicePdfService::class);
    $pdfMock->shouldReceive('generateAndStoreInvoice')->twice()->andReturn('invoices/test.pdf');
    app()->instance(InvoicePdfService::class, $pdfMock);

    $product = Product::create([
        'name' => 'Aguja de Biopsia',
        'code' => 'AGU-01',
        'description' => 'Test',
        'price' => 50.00,
        'active' => true,
    ]);

    $originalInvoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'amount' => 650.00,
        'discount' => 0.00,
        'subtotal' => 650.00,
        'exempt_amount' => 650.00,
        'tax_exempt_amount' => 650.00,
        'total' => 650.00,
        'total_paid' => 650.00,
        'invoice_file' => 'invoices/original.pdf',
        'is_group' => true,
        'quantity' => 2,
    ]);
    $this->caiRange->update(['last_used_number' => 1]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 2 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);

    $originalInvoice->update(['group_id' => $group->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    $spec1->products()->attach($product->id, ['quantity' => 1, 'price' => 50.00]);

    InvoiceSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec1->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'exempt_amount' => 300.00,
        'total' => 300.00,
        'selected_price' => '300.00',
        'is_paid' => true,
    ]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec2->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'exempt_amount' => 300.00,
        'total' => 300.00,
        'selected_price' => '300.00',
        'is_paid' => true,
    ]);

    // Extract spec1 which has the product
    $response = $this->actingAs($this->user)
        ->post(route('invoices.extract-specimens', $originalInvoice->id), [
            'specimen_ids' => [$spec1->id],
        ]);

    $response->assertRedirect();

    $newInvoice = Invoice::where('id', '!=', $originalInvoice->id)->latest('id')->first();
    // 300 exam + 50 product = 350
    expect((float) $newInvoice->total)->toBe(350.00);

    $originalInvoice->refresh();
    // 300 exam = 300
    expect((float) $originalInvoice->total)->toBe(300.00);
});

test('cannot extract specimens from credit invoice using this endpoint', function () {
    $creditInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'credit',
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'invoice_file' => 'invoices/credit.pdf',
        'is_group' => true,
    ]);

    $spec = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('invoices.extract-specimens', $creditInvoice->id), [
            'specimen_ids' => [$spec->id],
        ]);

    $response->assertSessionHasErrors(['specimen_ids' => 'Esta acción no está permitida en facturas a crédito. Utilice la función de extraer muestras de crédito.']);
});

test('cannot extract all specimens from the group (must keep at least one)', function () {
    $originalInvoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'total_paid' => 600.00,
        'invoice_file' => 'invoices/original.pdf',
        'is_group' => true,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital San Pedro - 2 Muestras',
        'invoice_id' => $originalInvoice->id,
        'customer_id' => $this->customer->id,
        'access_token' => Str::random(32),
    ]);
    $originalInvoice->update(['group_id' => $group->id]);

    $spec1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $spec2 = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec1->id,
        'quantity' => 1,
        'amount' => 300.00,
        'subtotal' => 300.00,
        'total' => 300.00,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $originalInvoice->id,
        'group_id' => $group->id,
        'specimen_id' => $spec2->id,
        'quantity' => 1,
        'amount' => 300.00,
        'subtotal' => 300.00,
        'total' => 300.00,
    ]);

    // Try to extract both specimens (all)
    $response = $this->actingAs($this->user)
        ->post(route('invoices.extract-specimens', $originalInvoice->id), [
            'specimen_ids' => [$spec1->id, $spec2->id],
        ]);

    $response->assertSessionHasErrors('specimen_ids');
});

test('user without invoices.manage permission is forbidden', function () {
    $regularUser = User::factory()->create(['active' => true]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'payment_type' => 'cash',
        'amount' => 600.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'invoice_file' => 'invoices/original.pdf',
        'is_group' => true,
    ]);

    $response = $this->actingAs($regularUser)
        ->post(route('invoices.extract-specimens', $originalInvoice->id), [
            'specimen_ids' => [1],
        ]);

    $response->assertForbidden();
});
