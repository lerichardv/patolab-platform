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
});

test('invoices page delivers immediate filter props and defers invoices data', function () {
    Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 1000.0,
        'discount' => 0.0,
        'total' => 1000.0,
        'total_paid' => 1000.0,
        'invoice_file' => 'invoices/test.pdf',
        'invoice_date' => now(),
        'invoice_type' => 'standard',
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('invoices.index', ['test_defer' => 1]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('invoices/index')
            ->has('filters')
            ->has('banks')
            ->has('examinations')
            ->has('groups')
        );

    // Verify partial reload loads the deferred invoices
    $partialResponse = $this->actingAs($this->user)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia\Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'invoices/index',
            'X-Inertia-Partial-Data' => 'invoices',
        ])
        ->get(route('invoices.index'));

    $partialResponse->assertOk()
        ->assertJsonPath('props.invoices.data.0.full_invoice_number', '000-001-01-00000001');
});
