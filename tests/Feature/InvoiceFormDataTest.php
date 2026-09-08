<?php

use App\Models\Bank;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
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

    $viewPermission = Permission::create(['slug' => 'invoices.view', 'name' => 'Ver Facturas']);
    $this->adminRole->permissions()->attach($viewPermission);

    $this->customer = Customer::create([
        'name' => 'Test Patient',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'masculino',
        'type' => 'cliente',
    ]);

    $this->type = SpecimenType::create(['name' => 'BIO', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Biopsia General',
        'specimen_type' => $this->type->id,
        'active' => true,
    ]);
    $this->bank = Bank::create(['name' => 'BAC Credomatic']);

    Setting::create(['setting_key' => 'third_age_discount', 'setting_value' => '30', 'description' => 'Descuento tercera edad']);
    Setting::create(['setting_key' => 'fourth_age_discount', 'setting_value' => '40', 'description' => 'Descuento cuarta edad']);
});

test('unauthenticated users cannot access invoice form data', function () {
    $this->getJson(route('invoices.form-data'))
        ->assertUnauthorized();
});

test('users without invoices.view permission cannot access invoice form data', function () {
    $roleWithoutPermission = Role::create(['slug' => 'limited', 'name' => 'Limited']);
    $limitedUser = User::factory()->create([
        'role_id' => $roleWithoutPermission->id,
        'active' => true,
    ]);

    $this->actingAs($limitedUser)
        ->getJson(route('invoices.form-data'))
        ->assertForbidden();
});

test('returns all reference data keys for invoices', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('invoices.form-data'))
        ->assertOk()
        ->assertJsonStructure([
            'banks',
            'specimenTypes',
            'examinations',
            'settings',
        ]);

    $data = $response->json();

    expect($data['banks'])->toBeArray()->toHaveCount(1);
    expect($data['specimenTypes'])->toBeArray()->toHaveCount(1);
    expect($data['examinations'])->toBeArray()->toHaveCount(1);
    expect($data['settings'])->toBeArray();
    expect($data['settings']['third_age_discount'])->toBe('30');
    expect($data)->not->toHaveKey('invoice');
});

test('returns invoice with relations when invoice_id is provided', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'amount' => '1500.00',
        'discount' => '0.00',
        'subtotal' => '1500.00',
        'exempt_amount' => '0.00',
        'total' => '1500.00',
        'total_paid' => '1500.00',
        'status' => 'paid',
        'payment_type' => 'cash',
        'invoice_file' => 'dummy.pdf',
        'created_by_id' => $this->user->id,
    ]);

    $data = $this->actingAs($this->user)
        ->getJson(route('invoices.form-data', ['invoice_id' => $invoice->id]))
        ->assertOk()
        ->json();

    expect($data)->toHaveKey('invoice');
    expect($data['invoice']['id'])->toBe($invoice->id);
    expect($data['invoice']['customer'])->not->toBeNull();
    expect($data['invoice']['customer']['name'])->toBe('Test Patient');
});

test('returns 404 when invalid invoice_id is provided', function () {
    $this->actingAs($this->user)
        ->getJson(route('invoices.form-data', ['invoice_id' => 99999]))
        ->assertNotFound();
});
