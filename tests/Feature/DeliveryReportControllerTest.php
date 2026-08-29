<?php

use App\Models\Customer;
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
