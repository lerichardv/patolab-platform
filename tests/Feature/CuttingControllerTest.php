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
    // 1. Create a user to act as authenticated pathologist
    $pathologistRole = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $createPermission = Permission::create(['slug' => 'cutting_codes.create', 'name' => 'Crear Código de Casete']);
    $pathologistRole->permissions()->attach($createPermission);
    $this->user = User::factory()->create([
        'role_id' => $pathologistRole->id,
        'active' => true,
    ]);

    // 2. Create support models
    $this->customer = Customer::factory()->create();
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia Tipo']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Examen',
        'code' => 'EX',
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

    // 3. Create target specimen
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

    // 4. Create cutting code and work order type
    $this->code = CuttingCode::create(['code' => 'A', 'color' => '#ffffff']);
    $this->slideType = WorkOrderType::create([
        'name' => 'Giemsa',
        'duration_unit' => 'days',
        'duration_value' => 1,
    ]);
});

test('user can store a new cutting for a specimen', function () {
    $response = $this->actingAs($this->user)
        ->post(route('cuttings.store', $this->specimen->sequence_code), [
            'code_id' => $this->code->id,
            'description' => 'Corte distal de lesión 1',
            'number_of_cuttings' => 2,
            'cuttings_description' => 'Cortes representativos',
            'number_of_slides' => 1,
            'cutting_slide_types' => [$this->slideType->id],
            'comments' => 'Dejar en formalina',
            'responsible_id' => $this->user->id,
        ]);

    $response->assertRedirect();

    $cutting = Cutting::first();
    expect($cutting)->not->toBeNull();
    expect($cutting->specimen_id)->toBe($this->specimen->id);
    expect($cutting->description)->toBe('Corte distal de lesión 1');
    expect($cutting->status)->toBe('macroscopy');
    expect($cutting->cutting_slide_types)->toBe([$this->slideType->id]);
});

test('user can update cutting details', function () {
    $cutting = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->code->id,
        'description' => 'Original',
        'number_of_cuttings' => 1,
        'cuttings_description' => '',
        'number_of_slides' => 1,
        'cutting_slide_types' => [$this->slideType->id],
        'responsible_id' => $this->user->id,
        'status' => 'processing',
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('cuttings.update', $cutting->id), [
            'code_id' => $this->code->id,
            'description' => 'Updated Description',
            'number_of_cuttings' => 3,
            'cuttings_description' => 'Updated Desc',
            'number_of_slides' => 2,
            'cutting_slide_types' => [$this->slideType->id],
            'comments' => 'New Comment',
            'responsible_id' => $this->user->id,
            'status' => 'macroscopy',
        ]);

    $response->assertRedirect();

    $cutting->refresh();
    expect($cutting->description)->toBe('Updated Description');
    expect($cutting->number_of_cuttings)->toBe(3);
    expect($cutting->status)->toBe('macroscopy');
});

test('user can transition cutting status', function () {
    $cutting = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->code->id,
        'description' => 'Original',
        'number_of_cuttings' => 1,
        'cuttings_description' => '',
        'number_of_slides' => 1,
        'cutting_slide_types' => [$this->slideType->id],
        'responsible_id' => $this->user->id,
        'status' => 'processing',
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('cuttings.update-status', $cutting->id), [
            'status' => 'delivered',
        ]);

    $response->assertRedirect();

    $cutting->refresh();
    expect($cutting->status)->toBe('delivered');
});

test('user can delete a cutting', function () {
    $cutting = Cutting::create([
        'specimen_id' => $this->specimen->id,
        'code_id' => $this->code->id,
        'description' => 'To delete',
        'number_of_cuttings' => 1,
        'cuttings_description' => '',
        'number_of_slides' => 1,
        'cutting_slide_types' => [$this->slideType->id],
        'responsible_id' => $this->user->id,
        'status' => 'processing',
    ]);

    $response = $this->actingAs($this->user)
        ->delete(route('cuttings.destroy', $cutting->id));

    $response->assertRedirect();
    expect(Cutting::find($cutting->id))->toBeNull();
});

test('user can store a new cutting code', function () {
    $response = $this->actingAs($this->user)
        ->post(route('cutting-codes.store'), [
            'code' => 'B',
            'color' => '#ff0000',
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('cutting_codes', [
        'code' => 'B',
        'color' => '#ff0000',
    ]);
});
