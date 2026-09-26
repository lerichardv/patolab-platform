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
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->role = Role::create(['slug' => 'admin', 'name' => 'Administrador']);
    $this->viewPermission = Permission::create([
        'slug' => 'specimens.view',
        'name' => 'Ver Muestras',
    ]);
    $this->role->permissions()->attach($this->viewPermission);

    $this->user = User::factory()->create([
        'name' => 'Test Admin',
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'General', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Smith', 'active' => true, 'referrer_type' => $this->referrerType->id]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#3b82f6',
        'order' => 1,
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'General',
        'quantity' => 1,
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'code' => 'BIO',
        'active' => true,
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Biopsia Simple',
        'specimen_type' => $this->specimenType->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create(['name' => 'John Doe']);
});

test('specimens page delivers immediate filter props and defers priorities data', function () {
    Specimen::create([
        'sequence_code' => 'BIO-0001-09-2026',
        'customer' => $this->customer->id,
        'priority_id' => $this->priority->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('specimens.index', ['test_defer' => 1]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('specimens/index')
            ->has('filters')
            ->has('specimenTypes')
            ->has('examinations')
            ->has('settings')
            ->has('usersList')
        );

    // Verify partial reload loads the deferred priorities
    $partialResponse = $this->actingAs($this->user)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'specimens/index',
            'X-Inertia-Partial-Data' => 'priorities',
        ])
        ->get(route('specimens.index'));

    $partialResponse->assertOk()
        ->assertJsonPath('props.priorities.0.name', 'Normal')
        ->assertJsonPath('props.priorities.0.specimens.0.sequence_code', 'BIO-0001-09-2026');
});
