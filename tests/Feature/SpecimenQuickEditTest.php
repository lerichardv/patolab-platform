<?php

use App\Models\Customer;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    // Grant specimens.edit permission
    Gate::define('specimens.edit', fn () => true);

    $this->customer = Customer::factory()->create();

    $this->category1 = SpecimenCategory::create([
        'name' => 'Urgente',
        'quantity' => 1,
        'active' => true,
    ]);
    $this->category2 = SpecimenCategory::create([
        'name' => 'Rutina',
        'quantity' => 1,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Médico',
        'active' => true,
    ]);
    $this->referrer1 = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);
    $this->referrer2 = Referrer::create([
        'name' => 'Dr. Wilson',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority1 = Priority::create([
        'name' => 'Alta',
        'color' => '#ef4444',
        'order' => 10,
        'active' => true,
    ]);
    $this->priority2 = Priority::create([
        'name' => 'Baja',
        'color' => '#10b981',
        'order' => 1,
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category1->id,
        'referrer' => $this->referrer1->id,
        'priority_id' => $this->priority1->id,
        'sample_collection_date' => '2026-08-01',
        'status' => 'received',
        'diagnosis' => 'Initial Diagnosis',
        'anatomic_site' => 'Left Hand',
        'clinical_notes' => 'Some initial notes',
        'active' => true,
    ]);
});

test('quick-edit-metadata returns referrers, categories, and priorities as json', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('specimens.quick-edit-metadata'));

    $response->assertStatus(200);

    $response->assertJsonStructure([
        'referrers',
        'categories',
        'priorities',
    ]);

    expect($response->json('referrers'))->toHaveCount(2);
    expect($response->json('categories'))->toHaveCount(2);
    expect($response->json('priorities'))->toHaveCount(2);
});

test('quick-update updates only allowed metadata fields and preserves others', function () {
    Storage::fake('public');
    $file = UploadedFile::fake()->create('medical_order.pdf', 100);

    $response = $this->actingAs($this->user)
        ->post(route('specimens.quick-update', $this->specimen->id), [
            'referrer' => $this->referrer2->id,
            'specimen_category' => $this->category2->id,
            'priority_id' => $this->priority2->id,
            'sample_collection_date' => '2026-08-15',
            'status' => 'macroscopic_review',
            'diagnosis' => 'Updated Diagnosis',
            'anatomic_site' => 'Right Hand',
            'clinical_notes' => 'Updated clinical notes',
            'medical_order_file' => $file,
        ]);

    $response->assertRedirect();

    $this->specimen->refresh();

    // Verify updated values
    expect($this->specimen->referrer)->toBe($this->referrer2->id);
    expect($this->specimen->specimen_category)->toBe($this->category2->id);
    expect($this->specimen->priority_id)->toBe($this->priority2->id);
    expect($this->specimen->sample_collection_date->format('Y-m-d'))->toBe('2026-08-15');
    expect($this->specimen->status)->toBe('macroscopic_review');
    expect($this->specimen->diagnosis)->toBe('Updated Diagnosis');
    expect($this->specimen->anatomic_site)->toBe('Right Hand');
    expect($this->specimen->clinical_notes)->toBe('Updated clinical notes');
    expect($this->specimen->medical_order_file)->not->toBeNull();

    // Verify unchanged values (e.g. customer, specimen_type, sequence_code)
    expect($this->specimen->customer)->toBe($this->customer->id);
    expect($this->specimen->specimen_type)->toBe(1);
    expect($this->specimen->sequence_code)->toBe('BIO-0001-08-2026');
});
