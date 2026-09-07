<?php

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenExamination;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $role = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $viewPermission = Permission::create(['slug' => 'reports.delivery.view', 'name' => 'Ver Reporte de Entrega']);
    $role->permissions()->attach($viewPermission);

    $this->user = User::factory()->create([
        'name' => 'Dr. Jane Doe',
        'role_id' => $role->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create();
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Análisis',
        'code' => 'AN',
        'description' => 'Desc',
        'active' => true,
    ]);
    $this->category = SpecimenCategory::create(['name' => 'Cat', 'quantity' => 1]);

    $this->referrerType = ReferrerType::create(['name' => 'RefType']);
    $this->referrer = Referrer::create([
        'name' => 'Ref',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Baja',
        'color' => '#10b981',
        'order' => 3,
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'status' => 'received',
    ]);

    $this->specimen->users()->attach($this->user->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);
});

test('authenticated user with permission can view delivery report and assigned pathologists are loaded', function () {
    $response = $this->actingAs($this->user)->get('/reports/delivery');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->has('pathologists', 1)
        ->where('specimens.data.0.id', $this->specimen->id)
        ->where('specimens.data.0.users.0.id', $this->user->id)
        ->where('specimens.data.0.users.0.name', 'Dr. Jane Doe')
    );
});

test('delivery report can filter specimens by assigned pathologist', function () {
    $otherPathologist = User::factory()->create([
        'name' => 'Dr. John Smith',
        'role_id' => $this->user->role_id,
        'active' => true,
    ]);

    $otherSpecimen = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Piel',
        'diagnosis' => 'Nevus',
        'status' => 'received',
    ]);
    $otherSpecimen->users()->attach($otherPathologist->id);

    // Filter by $this->user only
    $response = $this->actingAs($this->user)->get(route('reports.delivery.index', [
        'pathologist_id' => [$this->user->id],
    ]));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.id', $this->specimen->id)
    );

    // Filter by $otherPathologist only
    $responseOther = $this->actingAs($this->user)->get(route('reports.delivery.index', [
        'pathologist_id' => [$otherPathologist->id],
    ]));

    $responseOther->assertStatus(200);
    $responseOther->assertInertia(fn (Assert $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.id', $otherSpecimen->id)
    );
});

test('authenticated user can export delivery report with pathologists column to excel', function () {
    $response = $this->actingAs($this->user)->get(route('reports.delivery.export', [
        'pathologist_id' => [$this->user->id],
    ]));

    $response->assertStatus(200);
    $contentDisposition = $response->headers->get('Content-Disposition');
    expect($contentDisposition)->toStartWith('attachment; filename=');
    expect($contentDisposition)->toContain('hoja_de_entrega_muestras_');
    expect($contentDisposition)->toEndWith('.xlsx');
});

test('delivery report returns examination_items with quantities and names', function () {
    $exam2 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Inmunohistoquímica',
        'code' => 'IHQ',
        'active' => true,
    ]);

    SpecimenExamination::create([
        'specimen_id' => $this->specimen->id,
        'examination_id' => $this->examination->id,
    ]);
    SpecimenExamination::create([
        'specimen_id' => $this->specimen->id,
        'examination_id' => $exam2->id,
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $this->specimen->id,
        'invoice_number' => '00001001',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00001001',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 1500,
        'total_paid' => 1500,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $this->specimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $this->specimen->id,
        'examination_id' => $exam2->id,
        'quantity' => 3,
    ]);

    $response = $this->actingAs($this->user)->get('/reports/delivery');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.examination_items.0.name', 'Análisis')
        ->where('specimens.data.0.examination_items.0.quantity', 1)
        ->where('specimens.data.0.examination_items.1.name', 'Inmunohistoquímica')
        ->where('specimens.data.0.examination_items.1.quantity', 3)
    );
});

test('delivery report filters specimens using SpecimenExamination relationship', function () {
    $exam2 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Citología Especial',
        'code' => 'CE',
        'active' => true,
    ]);

    $specimenWithoutLegacyCol = Specimen::create([
        'sequence_code' => 'BIO-9999-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => null,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Cuello',
        'diagnosis' => 'Normal',
        'status' => 'received',
    ]);

    SpecimenExamination::create([
        'specimen_id' => $specimenWithoutLegacyCol->id,
        'examination_id' => $exam2->id,
    ]);

    // Filter by $exam2 only
    $response = $this->actingAs($this->user)->get(route('reports.delivery.index', [
        'examination_id' => [$exam2->id],
    ]));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/delivery/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.id', $specimenWithoutLegacyCol->id)
    );
});
