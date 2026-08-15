<?php

use App\Models\Customer;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('can retrieve specimens using a given referrer', function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $permission = Permission::create(['slug' => 'referrers.view', 'name' => 'Ver Remitentes']);
    $role->permissions()->attach($permission);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create(['name' => 'Doctor', 'active' => true]);
    $referrer = Referrer::create([
        'name' => 'Dr. Armando Casas',
        'referrer_type' => $referrerType->id,
        'notes' => 'Hospital Central',
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $priority = Priority::create(['name' => 'Rutina', 'days' => 3, 'color' => '#000000', 'order' => 1]);
    $specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $examination = \App\Models\SpecimenTypeExamination::create([
        'specimen_type' => $specimenType->id,
        'name' => 'Biopsia Simple',
        'price' => 100,
    ]);

    $category = \App\Models\SpecimenCategory::create(['name' => 'Patología', 'quantity' => 1]);

    $specimen1 = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $customer->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'status' => 'received',
    ]);

    $specimen2 = Specimen::create([
        'sequence_code' => 'CYT-0002-08-2026',
        'customer' => $customer->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'specimen_type' => $specimenType->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'status' => 'processing',
    ]);

    $response = $this->actingAs($user)->getJson(route('referrers.specimens', $referrer));

    $response->assertOk()
        ->assertJson([
            'total' => 2,
        ])
        ->assertJsonFragment(['sequence_code' => 'BIO-0001-08-2026'])
        ->assertJsonFragment(['sequence_code' => 'CYT-0002-08-2026']);
});
