<?php

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenCollaborator;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenUser;
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
        'name' => 'Admin User',
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

test('assignUser individual records assigned_by and logs to audit_log table', function () {
    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/assign-user", [
            'user_id' => $this->pathologistUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ]);

    $response->assertOk();

    // Verify database record has assigned_by
    $specimenUser = SpecimenUser::where('specimen_id', $this->specimen->id)
        ->where('user_id', $this->pathologistUser->id)
        ->first();

    expect($specimenUser)->not->toBeNull();
    expect($specimenUser->assigned_by)->toBe($this->user->id);
    expect($specimenUser->assigned_by_user_name)->toBe($this->user->name);

    // Verify audit_log table has records
    $auditLogs = AuditLog::where('table', 'specimen_user')
        ->where('row_id', $specimenUser->id)
        ->where('origin', 'pathologist-assignment')
        ->get();

    expect($auditLogs->count())->toBeGreaterThan(0);

    $specimenIdLog = $auditLogs->firstWhere('column', 'specimen_id');
    expect($specimenIdLog)->not->toBeNull();
    expect($specimenIdLog->action)->toBe('create');
    expect((int) $specimenIdLog->new_value)->toBe($this->specimen->id);
    expect($specimenIdLog->user)->toBe($this->user->id);

    $userIdLog = $auditLogs->firstWhere('column', 'user_id');
    expect($userIdLog)->not->toBeNull();
    expect((int) $userIdLog->new_value)->toBe($this->pathologistUser->id);

    $assignedByLog = $auditLogs->firstWhere('column', 'assigned_by');
    expect($assignedByLog)->not->toBeNull();
    expect((int) $assignedByLog->new_value)->toBe($this->user->id);
});

test('unassignUser individual logs to audit_log table with delete action', function () {
    $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/assign-user", [
            'user_id' => $this->pathologistUser->id,
            'macroscopy_access' => true,
            'microscopy_access' => true,
        ]);

    $specimenUser = SpecimenUser::where('specimen_id', $this->specimen->id)
        ->where('user_id', $this->pathologistUser->id)
        ->first();
    $pivotId = $specimenUser->id;

    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/unassign-user", [
            'user_id' => $this->pathologistUser->id,
        ]);

    $response->assertOk();

    // Verify deletion in database
    expect(SpecimenUser::find($pivotId))->toBeNull();

    // Verify audit_log table has delete record
    $deleteLogs = AuditLog::where('table', 'specimen_user')
        ->where('row_id', $pivotId)
        ->where('action', 'delete')
        ->where('origin', 'pathologist-unassignment')
        ->get();

    expect($deleteLogs->count())->toBeGreaterThanOrEqual(1);

    $deletedAtLog = $deleteLogs->firstWhere('column', 'deleted_at');
    expect($deletedAtLog)->not->toBeNull();
    expect($deletedAtLog->new_value)->toBe('deleted');
    expect($deletedAtLog->user)->toBe($this->user->id);

    $specimenIdLog = $deleteLogs->firstWhere('column', 'specimen_id');
    expect($specimenIdLog)->not->toBeNull();
    expect((int) $specimenIdLog->old_value)->toBe($this->specimen->id);
});

test('assignCollaborator individual records assigned_by and logs to audit_log table', function () {
    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/assign-collaborator", [
            'user_id' => $this->assistantUser->id,
            'macroscopy_access' => false,
            'microscopy_access' => true,
        ]);

    $response->assertOk();

    $specimenCollaborator = SpecimenCollaborator::where('specimen_id', $this->specimen->id)
        ->where('user_id', $this->assistantUser->id)
        ->first();

    expect($specimenCollaborator)->not->toBeNull();
    expect($specimenCollaborator->assigned_by)->toBe($this->user->id);
    expect($specimenCollaborator->assigned_by_user_name)->toBe($this->user->name);

    $auditLogs = AuditLog::where('table', 'specimen_collaborators')
        ->where('row_id', $specimenCollaborator->id)
        ->where('origin', 'collaborator-assignment')
        ->get();

    expect($auditLogs->count())->toBeGreaterThan(0);

    $specimenIdLog = $auditLogs->firstWhere('column', 'specimen_id');
    expect($specimenIdLog)->not->toBeNull();
    expect($specimenIdLog->action)->toBe('create');
    expect((int) $specimenIdLog->new_value)->toBe($this->specimen->id);

    $assignedByLog = $auditLogs->firstWhere('column', 'assigned_by');
    expect($assignedByLog)->not->toBeNull();
    expect((int) $assignedByLog->new_value)->toBe($this->user->id);
});

test('unassignCollaborator individual logs to audit_log table with delete action', function () {
    $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/assign-collaborator", [
            'user_id' => $this->assistantUser->id,
            'macroscopy_access' => false,
            'microscopy_access' => true,
        ]);

    $specimenCollaborator = SpecimenCollaborator::where('specimen_id', $this->specimen->id)
        ->where('user_id', $this->assistantUser->id)
        ->first();
    $pivotId = $specimenCollaborator->id;

    $response = $this->actingAs($this->user)
        ->postJson("/specimens/{$this->specimen->id}/unassign-collaborator", [
            'user_id' => $this->assistantUser->id,
        ]);

    $response->assertOk();

    expect(SpecimenCollaborator::find($pivotId))->toBeNull();

    $deleteLogs = AuditLog::where('table', 'specimen_collaborators')
        ->where('row_id', $pivotId)
        ->where('action', 'delete')
        ->where('origin', 'collaborator-unassignment')
        ->get();

    expect($deleteLogs->count())->toBeGreaterThanOrEqual(1);
    expect($deleteLogs->firstWhere('column', 'deleted_at'))->not->toBeNull();
});

test('bulkAction assign_pathologist records assigned_by and logs to audit_log table', function () {
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

    $response->assertOk();

    $pivot1 = SpecimenUser::where('specimen_id', $this->specimen->id)->where('user_id', $this->pathologistUser->id)->first();
    $pivot2 = SpecimenUser::where('specimen_id', $secondSpecimen->id)->where('user_id', $this->pathologistUser->id)->first();

    expect($pivot1->assigned_by)->toBe($this->user->id);
    expect($pivot2->assigned_by)->toBe($this->user->id);

    $auditLogs = AuditLog::where('table', 'specimen_user')
        ->whereIn('row_id', [$pivot1->id, $pivot2->id])
        ->where('origin', 'bulk-pathologist-assignment')
        ->get();

    expect($auditLogs->count())->toBeGreaterThan(0);
});

test('bulkAction unassign_pathologist logs to audit_log table with delete action', function () {
    $this->specimen->users()->attach($this->pathologistUser->id, [
        'macroscopy_access' => true,
        'microscopy_access' => true,
    ]);

    $pivot = SpecimenUser::where('specimen_id', $this->specimen->id)->where('user_id', $this->pathologistUser->id)->first();
    $pivotId = $pivot->id;

    $response = $this->actingAs($this->user)
        ->postJson('/specimens/bulk-action', [
            'ids' => [$this->specimen->id],
            'action' => 'unassign_pathologist',
            'value' => $this->pathologistUser->id,
        ]);

    $response->assertOk();

    $deleteLogs = AuditLog::where('table', 'specimen_user')
        ->where('row_id', $pivotId)
        ->where('action', 'delete')
        ->where('origin', 'bulk-pathologist-unassignment')
        ->get();

    expect($deleteLogs->count())->toBeGreaterThanOrEqual(1);
});

test('bulkAction assign_collaborator records assigned_by and logs to audit_log table', function () {
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

    $response->assertOk();

    $pivot1 = SpecimenCollaborator::where('specimen_id', $this->specimen->id)->where('user_id', $this->assistantUser->id)->first();
    $pivot2 = SpecimenCollaborator::where('specimen_id', $secondSpecimen->id)->where('user_id', $this->assistantUser->id)->first();

    expect($pivot1->assigned_by)->toBe($this->user->id);
    expect($pivot2->assigned_by)->toBe($this->user->id);

    $auditLogs = AuditLog::where('table', 'specimen_collaborators')
        ->whereIn('row_id', [$pivot1->id, $pivot2->id])
        ->where('origin', 'bulk-collaborator-assignment')
        ->get();

    expect($auditLogs->count())->toBeGreaterThan(0);
});

test('bulkAction unassign_collaborator logs to audit_log table with delete action', function () {
    $this->specimen->collaborators()->attach($this->assistantUser->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);

    $pivot = SpecimenCollaborator::where('specimen_id', $this->specimen->id)->where('user_id', $this->assistantUser->id)->first();
    $pivotId = $pivot->id;

    $response = $this->actingAs($this->user)
        ->postJson('/specimens/bulk-action', [
            'ids' => [$this->specimen->id],
            'action' => 'unassign_collaborator',
            'value' => $this->assistantUser->id,
        ]);

    $response->assertOk();

    $deleteLogs = AuditLog::where('table', 'specimen_collaborators')
        ->where('row_id', $pivotId)
        ->where('action', 'delete')
        ->where('origin', 'bulk-collaborator-unassignment')
        ->get();

    expect($deleteLogs->count())->toBeGreaterThanOrEqual(1);
});
