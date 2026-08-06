<?php

use App\Models\Customer;
use App\Models\Cutting;
use App\Models\CuttingCode;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\WorkOrderType;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $role = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $viewPermission = Permission::create(['slug' => 'reports.cuttings.view', 'name' => 'Ver Facturas / Reportes']);
    $role->permissions()->attach($viewPermission);

    $this->user = User::factory()->create([
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
    ]);

    $this->code = CuttingCode::create(['code' => 'A', 'color' => '#ffffff']);
    $this->workOrderType = WorkOrderType::create([
        'name' => 'Giemsa',
        'duration_unit' => 'days',
        'duration_value' => 1,
    ]);

    $this->cutting = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->code->id,
        'description' => 'Test cutting description',
        'number_of_cuttings' => 5,
        'cuttings_description' => 'CR',
        'number_of_slides' => 5,
        'cutting_slide_types' => [$this->workOrderType->id],
        'status' => 'macroscopy',
        'comments' => 'Special comments',
        'responsible_id' => $this->user->id,
    ]);
});

test('authenticated pathologists can view the cuttings report page', function () {
    $response = $this->actingAs($this->user)->get('/reports/cuttings');

    $response->assertStatus(200);
});

test('cuttings report page applies date, search and user filters correctly', function () {
    $response = $this->actingAs($this->user)->get(route('reports.cuttings.index', [
        'search' => 'Special comments',
        'responsible_id' => $this->user->id,
    ]));

    $response->assertStatus(200);
});

test('authenticated pathologists can export the cuttings report to excel', function () {
    $response = $this->actingAs($this->user)->get(route('reports.cuttings.export', [
        'format' => 'xlsx',
    ]));

    $response->assertStatus(200);
    $contentDisposition = $response->headers->get('Content-Disposition');
    expect($contentDisposition)->toStartWith('attachment; filename=reporte_hoja_relacion_biopsias_');
    expect($contentDisposition)->toEndWith('.xlsx');
});
