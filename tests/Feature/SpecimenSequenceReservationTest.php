<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('guest users cannot reserve code', function () {
    $response = $this->postJson('/specimens/reserve-code', [
        'specimen_type_id' => 1,
    ]);

    $response->assertStatus(401);
});

test('authenticated users can reserve code and it increments sequence', function () {
    Carbon::setTestNow('2026-07-15');

    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $type = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $sequence = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 10,
        'active' => true,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'CAI-TEST-123',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2026-12-31',
        'active_number' => '000-001-01-00000000',
        'status' => 'active',
    ]);

    $response1 = $this->actingAs($user)->postJson('/specimens/reserve-code', [
        'specimen_type_id' => $type->id,
    ]);

    $response1->assertStatus(200);
    $response1->assertJsonPath('code', 'BIO-0010-07-2026');

    // Sequence should now be 11
    $sequence->refresh();
    expect($sequence->current_sequence)->toBe(11);

    // Reserve again, should return 11
    $response2 = $this->actingAs($user)->postJson('/specimens/reserve-code', [
        'specimen_type_id' => $type->id,
    ]);

    $response2->assertStatus(200);
    $response2->assertJsonPath('code', 'BIO-0011-07-2026');

    $sequence->refresh();
    expect($sequence->current_sequence)->toBe(12);
});

test('store specimen with reserved code works and does not generate another code', function () {
    Carbon::setTestNow('2026-07-15');

    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.create', fn () => true);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();

    $location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $type = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $sequence = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'CAI-TEST-123',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2026-12-31',
        'active_number' => '000-001-01-00000000',
        'status' => 'active',
    ]);

    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Normal',
        'color' => '#000000',
        'order' => '1',
        'active' => true,
    ]);

    $referrer = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => 'Medico',
        'active' => true,
    ]);

    // Reserve first
    $reservedCode = 'BIO-0001-07-2026';
    $sequence->current_sequence = 2; // simulated reserved state
    $sequence->save();

    // Store using reserved code
    $response = $this->actingAs($user)->from('/specimens')->post('/specimens', [
        'customer' => $customer->id,
        'specimen_type' => $type->id,
        'reserved_code' => $reservedCode,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'status' => 'received',
        'priority_id' => $priority->id,
        'quantity' => 1,
        'amount' => 100,
        'discount' => 0,
        'payment_type' => 'cash',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect('/specimens');

    $specimen = Specimen::first();
    expect($specimen->sequence_code)->toBe($reservedCode);

    // Sequence current_sequence should remain 2 (not incremented again)
    $sequence->refresh();
    expect($sequence->current_sequence)->toBe(2);
});

test('store specimen fails when reserved code is already taken', function () {
    Carbon::setTestNow('2026-07-15');

    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.create', fn () => true);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();

    $location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $type = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $sequence = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'CAI-TEST-123',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2026-12-31',
        'active_number' => '000-001-01-00000000',
        'status' => 'active',
    ]);

    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Normal',
        'color' => '#000000',
        'order' => '1',
        'active' => true,
    ]);

    $referrer = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => 'Medico',
        'active' => true,
    ]);

    // Create an existing specimen with the code we will try to reuse
    $existingSpecimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'status' => 'received',
        'priority_id' => $priority->id,
    ]);

    // Attempt to store using the same code, should fail validation on unique:specimen,sequence_code
    $response = $this->actingAs($user)->post('/specimens', [
        'customer' => $customer->id,
        'specimen_type' => $type->id,
        'reserved_code' => 'BIO-0001-07-2026',
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'status' => 'received',
        'priority_id' => $priority->id,
        'quantity' => 1,
        'amount' => 100,
        'discount' => 0,
        'payment_type' => 'cash',
    ]);

    $response->assertSessionHasErrors(['reserved_code']);
});
