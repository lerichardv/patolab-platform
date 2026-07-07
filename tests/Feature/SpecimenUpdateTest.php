<?php

use App\Models\Customer;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('specimen sequence code and current sequence update when specimen type is changed', function () {
    // 1. Setup role and permissions
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    // Give all permissions (or bypass with Gate/auth)
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();

    $location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $type1 = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $type2 = SpecimenType::create([
        'name' => 'Citología',
        'active' => true,
    ]);

    $sequence1 = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type1->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    $sequence2 = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type2->id,
        'prefix' => 'CYT',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 5,
        'active' => true,
    ]);

    $examination1 = SpecimenTypeExamination::create([
        'specimen_type' => $type1->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);

    $examination2 = SpecimenTypeExamination::create([
        'specimen_type' => $type2->id,
        'name' => 'Examen 2',
        'code' => 'EX2',
        'description' => 'Desc 2',
        'active' => true,
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create([
        'name' => 'Tipo de Referente',
        'active' => true,
    ]);

    $referrer = Referrer::create([
        'name' => 'Referente',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Baja',
        'color' => '#10b981',
        'order' => 3,
        'active' => true,
    ]);

    // Create specimen with type1
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type1->id,
        'specimen_type_examination' => $examination1->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    // Act: Send update request with type2
    $response = $this->actingAs($user)
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type2->id,
            'specimen_type_examination' => $examination2->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'clinical_notes' => 'Notas',
            'status' => 'received',
            'priority_id' => $priority->id,
        ]);

    // Assert redirect
    $response->assertRedirect();

    // Verify specimen updated in database
    $specimen->refresh();
    expect($specimen->specimen_type)->toBe($type2->id);
    expect($specimen->sequence_code)->toBe('CYT-0005-07-2026');

    // Verify Sequence 2's current_sequence was incremented
    $sequence2->refresh();
    expect($sequence2->current_sequence)->toBe(6);
});
