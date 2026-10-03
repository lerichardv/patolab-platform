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

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Administrador']);
    $this->viewPermission = Permission::create([
        'slug' => 'invoices.view',
        'name' => 'Ver Facturas',
    ]);
    $this->adminRole->permissions()->attach($this->viewPermission);

    $this->user = User::factory()->create([
        'name' => 'Admin User',
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create(['name' => 'Sample Customer']);
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'XYZ-123',
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

    for ($i = 1; $i <= 30; $i++) {
        $padded = str_pad((string) $i, 8, '0', STR_PAD_LEFT);
        Invoice::create([
            'full_invoice_number' => "000-001-01-{$padded}",
            'invoice_number' => $padded,
            'cai_range_id' => $this->caiRange->id,
            'customer_id' => $this->customer->id,
            'payment_type' => 'cash',
            'quantity' => 1,
            'subtotal' => 100.0,
            'discount' => 0.0,
            'total' => 100.0,
            'total_paid' => 100.0,
            'invoice_file' => "invoices/test_{$i}.pdf",
            'invoice_date' => now(),
            'invoice_type' => 'specimen',
        ]);
    }
});

test('invoices listing uses default 10 per page', function () {
    $response = $this->actingAs($this->user)
        ->get(route('invoices.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('invoices/index')
            ->where('filters.per_page', 10)
            ->has('invoices.data', 10)
            ->where('invoices.per_page', 10)
            ->where('invoices.total', 30)
            ->where('invoices.last_page', 3)
        );
});

test('invoices listing respects custom per_page parameter', function () {
    $response = $this->actingAs($this->user)
        ->get(route('invoices.index', ['per_page' => 25]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('invoices/index')
            ->where('filters.per_page', 25)
            ->has('invoices.data', 25)
            ->where('invoices.per_page', 25)
            ->where('invoices.total', 30)
            ->where('invoices.last_page', 2)
        );
});

test('invoices listing falls back to 10 for invalid per_page parameter', function () {
    $response = $this->actingAs($this->user)
        ->get(route('invoices.index', ['per_page' => 999]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('invoices/index')
            ->where('filters.per_page', 10)
            ->has('invoices.data', 10)
            ->where('invoices.per_page', 10)
        );
});
