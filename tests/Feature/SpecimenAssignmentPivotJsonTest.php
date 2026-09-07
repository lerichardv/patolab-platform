<?php

use App\Models\Customer;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->pathologistRole = Role::create(['slug' => 'pathologist', 'name' => 'Pathologist']);
    $this->assistantRole = Role::create(['slug' => 'assistant_pathologist', 'name' => 'Assistant Pathologist']);

    Setting::create([
        'setting_key' => 'pathologist_role_id',
        'setting_value' => (string) $this->pathologistRole->id,
        'description' => 'Pathologist Role ID',
    ]);

    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $managePermission = Permission::create(['slug' => 'specimens.manage', 'name' => 'Asignar Patólogos']);
    $viewPermission = Permission::create(['slug' => 'specimens.view', 'name' => 'Ver Muestras']);

    $this->adminRole->permissions()->attach([$managePermission->id, $viewPermission->id]);

    $this->pathologistUser = User::factory()->create([
        'name' => 'Dr. House',
        'role_id' => $this->pathologistRole->id,
        'active' => true,
    ]);

    $this->secondPathologistUser = User::factory()->create([
        'name' => 'Dr. Wilson',
        'role_id' => $this->pathologistRole->id,
        'active' => true,
    ]);

    $this->assistantUser = User::factory()->create([
        'name' => 'Dr. Watson',
        'role_id' => $this->assistantRole->id,
        'active' => true,
    ]);

    $this->customer = Customer::create([
        'name' => 'Test Patient',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'masculino',
        'type' => 'cliente',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Médico Referidor', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Test', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#22c55e', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'BIO', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Biopsia General',
        'specimen_type' => $this->type->id,
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-09-2026',
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'customer' => $this->customer->id,
        'status' => 'received',
    ]);
});

test('assignUser returns updated users and collaborators as JSON when requested', function () {
    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/assign-user", [
            'user_id' => $this->pathologistUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Patólogo asignado con éxito.',
        ])
        ->assertJsonStructure([
            'success',
            'message',
            'users',
            'collaborators',
        ]);

    $data = $response->json();
    expect($data['users'])->toHaveCount(1);
    expect($data['users'][0]['id'])->toBe($this->pathologistUser->id);
    expect((bool) $data['users'][0]['pivot']['macroscopy_access'])->toBeTrue();
    expect((bool) $data['users'][0]['pivot']['microscopy_access'])->toBeTrue();
    expect($data['collaborators'])->toHaveCount(0);
});

test('unassignUser returns updated users and collaborators as JSON when requested', function () {
    $this->specimen->users()->attach($this->pathologistUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/unassign-user", [
            'user_id' => $this->pathologistUser->id,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Patólogo desasignado con éxito.',
        ]);

    $data = $response->json();
    expect($data['users'])->toHaveCount(0);
    expect($data['collaborators'])->toHaveCount(0);
});

test('assignCollaborator returns updated users and collaborators as JSON when requested', function () {
    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/assign-collaborator", [
            'user_id' => $this->assistantUser->id,
            'macroscopy_access' => false,
            'microscopy_access' => true,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Colaborador asignado con éxito.',
        ]);

    $data = $response->json();
    expect($data['collaborators'])->toHaveCount(1);
    expect($data['collaborators'][0]['id'])->toBe($this->assistantUser->id);
    expect((bool) $data['collaborators'][0]['pivot']['macroscopy_access'])->toBeFalse();
    expect((bool) $data['collaborators'][0]['pivot']['microscopy_access'])->toBeTrue();
});

test('unassignCollaborator returns updated users and collaborators as JSON when requested', function () {
    $this->specimen->collaborators()->attach($this->assistantUser->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/unassign-collaborator", [
            'user_id' => $this->assistantUser->id,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Colaborador desasignado con éxito.',
        ]);

    $data = $response->json();
    expect($data['collaborators'])->toHaveCount(0);
});

test('assignUser still redirects back for standard non-JSON web requests', function () {
    $response = $this->actingAs($this->user)
        ->from('/specimens')
        ->post("/specimens/{$this->specimen->id}/assign-user", [
            'user_id' => $this->pathologistUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ]);

    $response->assertRedirect('/specimens');
    $response->assertSessionHas('success', 'Patólogo asignado con éxito.');
});

test('bulkAction assign_pathologist returns updated specimens as JSON when requested', function () {
    $secondSpecimen = Specimen::create([
        'sequence_code' => 'BIO-0002-09-2026',
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'customer' => $this->customer->id,
        'status' => 'received',
    ]);

    $response = $this->actingAs($this->user)
        ->postJson('/specimens/bulk-action', [
            'ids' => [$this->specimen->id, $secondSpecimen->id],
            'action' => 'assign_pathologist',
            'value' => (string) $this->pathologistUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Acción en bulk realizada con éxito.',
        ]);

    $data = $response->json();
    expect($data['specimens'])->toHaveCount(2);
    expect($data['specimens'][0]['users'])->toHaveCount(1);
    expect($data['specimens'][0]['users'][0]['id'])->toBe($this->pathologistUser->id);
    expect($data['specimens'][1]['users'])->toHaveCount(1);
    expect($data['specimens'][1]['users'][0]['id'])->toBe($this->pathologistUser->id);
});

test('bulkAction unassign_pathologist returns updated specimens as JSON when requested', function () {
    $this->specimen->users()->attach($this->pathologistUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->postJson('/specimens/bulk-action', [
            'ids' => [$this->specimen->id],
            'action' => 'unassign_pathologist',
            'value' => $this->pathologistUser->id,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Acción en bulk realizada con éxito.',
        ]);

    $data = $response->json();
    expect($data['specimens'])->toHaveCount(1);
    expect($data['specimens'][0]['users'])->toHaveCount(0);
});

test('bulkAction assign_collaborator returns updated specimens as JSON when requested', function () {
    $secondSpecimen = Specimen::create([
        'sequence_code' => 'BIO-0003-09-2026',
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'customer' => $this->customer->id,
        'status' => 'received',
    ]);

    $response = $this->actingAs($this->user)
        ->postJson('/specimens/bulk-action', [
            'ids' => [$this->specimen->id, $secondSpecimen->id],
            'action' => 'assign_collaborator',
            'value' => (string) $this->assistantUser->id,
            'macroscopy_access' => false,
            'microscopy_access' => true,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Acción en bulk realizada con éxito.',
        ]);

    $data = $response->json();
    expect($data['specimens'])->toHaveCount(2);
    expect($data['specimens'][0]['collaborators'])->toHaveCount(1);
    expect($data['specimens'][0]['collaborators'][0]['id'])->toBe($this->assistantUser->id);
    expect((bool) $data['specimens'][0]['collaborators'][0]['pivot']['macroscopy_access'])->toBeFalse();
    expect((bool) $data['specimens'][0]['collaborators'][0]['pivot']['microscopy_access'])->toBeTrue();
    expect($data['specimens'][1]['collaborators'])->toHaveCount(1);
    expect($data['specimens'][1]['collaborators'][0]['id'])->toBe($this->assistantUser->id);
});

test('bulkAction unassign_collaborator returns updated specimens as JSON when requested', function () {
    $this->specimen->collaborators()->attach($this->assistantUser->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->postJson('/specimens/bulk-action', [
            'ids' => [$this->specimen->id],
            'action' => 'unassign_collaborator',
            'value' => $this->assistantUser->id,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Acción en bulk realizada con éxito.',
        ]);

    $data = $response->json();
    expect($data['specimens'])->toHaveCount(1);
    expect($data['specimens'][0]['collaborators'])->toHaveCount(0);
});
