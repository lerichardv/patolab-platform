<?php

use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenGroupCustomer;
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

    $this->oldCustomer = Customer::create([
        'name' => 'Hospital Antiguo',
        'id_number' => '0801199011111',
        'phone' => '99991111',
        'type' => 'empresa',
    ]);

    $this->newCustomer = Customer::create([
        'name' => 'Clinica Nueva',
        'id_number' => '0801199022222',
        'phone' => '99992222',
        'type' => 'empresa',
    ]);

    $this->patientCustomer = Customer::create([
        'name' => 'Juan Perez Paciente',
        'id_number' => '0801199033333',
        'phone' => '99993333',
        'type' => 'individual',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Clinica', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. House', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Examen Simple',
        'code' => 'EX1',
    ]);
});

test('returns customer-info for a specimen group on demand', function () {
    $group = SpecimenGroup::create([
        'name' => 'Hospital Antiguo - 1 Muestra',
        'customer_id' => $this->oldCustomer->id,
        'invoice_id' => 1,
    ]);

    $response = $this->getJson(route('specimen-groups.customer-info', $group));

    $response->assertOk()
        ->assertJsonPath('id', $group->id)
        ->assertJsonPath('name', 'Hospital Antiguo - 1 Muestra')
        ->assertJsonPath('customer_id', $this->oldCustomer->id)
        ->assertJsonPath('customer.name', 'Hospital Antiguo')
        ->assertJsonPath('specimens_count', 0);
});

test('updates specimen group customer, group name, pivot, invoice, and credit while preserving specimen patient', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->oldCustomer->id,
        'payment_type' => 'credit',
        'amount' => 1000,
        'subtotal' => 1000,
        'total' => 1000,
        'total_paid' => 0,
        'is_group' => true,
        'invoice_file' => '',
        'proof_of_payment' => '',
    ]);

    $credit = Credit::create([
        'customer_id' => $this->oldCustomer->id,
        'credit_amount' => 1000,
        'amount_paid' => 0,
        'amount_remaining' => 1000,
        'is_group' => true,
    ]);

    $invoice->update(['credit_payment_id' => $credit->id]);

    $group = SpecimenGroup::create([
        'name' => 'Hospital Antiguo - 2 Muestras',
        'customer_id' => $this->oldCustomer->id,
        'invoice_id' => $invoice->id,
    ]);

    $invoice->update(['group_id' => $group->id]);
    $credit->update(['group_id' => $group->id]);

    SpecimenGroupCustomer::create([
        'customer_id' => $this->oldCustomer->id,
        'specimen_group_id' => $group->id,
    ]);

    // Create 2 specimens inside the group belonging to the patient customer
    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->patientCustomer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->patientCustomer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    $response = $this->put(route('specimen-groups.update-customer', $group), [
        'customer_id' => $this->newCustomer->id,
    ]);

    $response->assertRedirect()
        ->assertSessionHas('success', 'Cliente principal del grupo de muestras actualizado con éxito.');

    // Verify SpecimenGroup updated
    $group->refresh();
    expect($group->customer_id)->toBe($this->newCustomer->id);
    expect($group->name)->toBe('Clinica Nueva - 2 Muestras');

    // Verify Pivot updated
    expect($group->customers()->pluck('customers.id')->toArray())->toContain($this->newCustomer->id);
    expect($group->customers()->pluck('customers.id')->toArray())->not->toContain($this->oldCustomer->id);

    // Verify Invoice updated
    $invoice->refresh();
    expect($invoice->customer_id)->toBe($this->newCustomer->id);

    // Verify Credit updated
    $credit->refresh();
    expect($credit->customer_id)->toBe($this->newCustomer->id);

    // CRITICAL: Verify Specimen patients are preserved
    $specimen1->refresh();
    $specimen2->refresh();
    expect($specimen1->customer)->toBe($this->patientCustomer->id);
    expect($specimen2->customer)->toBe($this->patientCustomer->id);
});

test('validates customer_id must exist', function () {
    $group = SpecimenGroup::create([
        'name' => 'Hospital Antiguo - 1 Muestra',
        'customer_id' => $this->oldCustomer->id,
        'invoice_id' => 1,
    ]);

    $response = $this->put(route('specimen-groups.update-customer', $group), [
        'customer_id' => 999999,
    ]);

    $response->assertSessionHasErrors(['customer_id']);
});
