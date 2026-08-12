<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('invoice listing can be sorted by invoice number', function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $viewPermission = Permission::create(['slug' => 'invoices.view', 'name' => 'Ver Facturas']);
    $role->permissions()->attach($viewPermission);

    $customer = Customer::create([
        'name' => 'Test Customer',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'mujer',
        'type' => 'individual',
    ]);

    $location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
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

    // Create invoice 1 with number 50
    Invoice::create([
        'invoice_number' => '00000050',
        'full_invoice_number' => '000-001-01-00000050',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
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

    // Create invoice 2 with number 10
    Invoice::create([
        'invoice_number' => '00000010',
        'full_invoice_number' => '000-001-01-00000010',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 100.00,
        'discount' => 0.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'is_group' => false,
        'invoice_type' => 'specimen',
        'invoice_file' => 'invoice_2.pdf',
    ]);

    // Sort asc
    $response = $this->actingAs($user)->get(route('invoices.index', [
        'sort_field' => 'invoice_number',
        'sort_direction' => 'asc',
    ]));

    $response->assertStatus(200);
    $response->assertInertia(function (Assert $page) {
        $data = $page->toArray()['props']['invoices']['data'];
        expect($data[0]['invoice_number'])->toEqual('00000010');
        expect($data[1]['invoice_number'])->toEqual('00000050');
    });

    // Sort desc
    $response = $this->actingAs($user)->get(route('invoices.index', [
        'sort_field' => 'invoice_number',
        'sort_direction' => 'desc',
    ]));

    $response->assertStatus(200);
    $response->assertInertia(function (Assert $page) {
        $data = $page->toArray()['props']['invoices']['data'];
        expect($data[0]['invoice_number'])->toEqual('00000050');
        expect($data[1]['invoice_number'])->toEqual('00000010');
    });
});
