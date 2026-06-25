<?php

use App\Models\Role;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create roles
    $this->adminRole = Role::create([
        'name' => 'Admin',
        'slug' => 'admin',
    ]);

    // Create admin user
    $this->admin = User::create([
        'name' => 'Admin User',
        'email' => 'admin@patolab.test',
        'password' => bcrypt('password'),
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    // Create a regular user (pathologist)
    $this->user = User::create([
        'name' => 'John Doe',
        'email' => 'john@patolab.test',
        'password' => bcrypt('password'),
        'active' => true,
    ]);

    // Create specimen type
    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsy',
        'active' => true,
    ]);

    // Create examinations
    $this->examination1 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Stomach Biopsy',
        'active' => true,
    ]);
});

test('user can view their own template list', function () {
    // Grant permission (can view)
    $this->admin->permissions = ['my_specimen_type_templates.view'];
    $response = $this->actingAs($this->admin)
        ->get(route('my-specimen-type-templates.index'));

    $response->assertStatus(200);
});
