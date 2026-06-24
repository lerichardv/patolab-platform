<?php

use App\Models\Role;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create admin role
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

    // Create a regular user
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

    $this->examination2 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Skin Biopsy',
        'active' => true,
    ]);
});

test('admin can view template list and gets correct props', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('specimen-type-templates.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('specimen-type-templates/index')
        ->has('templates')
        ->has('specimenTypes')
        ->has('users')
    );
});

test('guest cannot view template list', function () {
    $response = $this->get(route('specimen-type-templates.index'));
    $response->assertRedirect('/login');
});

test('admin can create specimen type template with default sections order', function () {
    $data = [
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => '<p>Clinical details template</p>',
        'diagnosis_html' => '<p>Diagnosis template</p>',
        'macroscopy_html' => '<p>Macroscopy template</p>',
        'microscopy_html' => '<p>Microscopy template</p>',
        'comments_notes_html' => '<p>Comments template</p>',
        'protocols_html' => '<p>Protocols template</p>',
        'legend_html' => '<p>Legend template</p>',
    ];

    $response = $this->actingAs($this->admin)
        ->post(route('specimen-type-templates.store'), $data);

    $response->assertRedirect();
    $this->assertDatabaseHas('specimen_type_templates', [
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => '<p>Clinical details template</p>',
        'diagnosis_html' => '<p>Diagnosis template</p>',
    ]);

    $template = SpecimenTypeTemplate::first();
    expect($template->sections_order)->toBeArray()
        ->toHaveCount(7)
        ->and($template->sections_order[0]['key'])->toBe('clinical_details_html')
        ->and($template->sections_order[1]['key'])->toBe('diagnosis_html');
});

test('cannot create duplicate template for same user and examination combination', function () {
    // Create first template
    SpecimenTypeTemplate::create([
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => 'clinical',
        'diagnosis_html' => 'diagnosis',
        'macroscopy_html' => 'macroscopy',
        'microscopy_html' => 'microscopy',
        'comments_notes_html' => 'comments',
        'protocols_html' => 'protocols',
        'legend_html' => 'legend',
    ]);

    // Try to create second template for same user + exam
    $data = [
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => 'clinical2',
        'diagnosis_html' => 'diagnosis2',
    ];

    $response = $this->actingAs($this->admin)
        ->from(route('specimen-type-templates.index'))
        ->post(route('specimen-type-templates.store'), $data);

    $response->assertSessionHasErrors(['specimen_type_examination_id']);
    expect(SpecimenTypeTemplate::count())->toBe(1);
});

test('admin can update specimen type template', function () {
    $template = SpecimenTypeTemplate::create([
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => 'old clinical',
        'diagnosis_html' => 'old diagnosis',
        'macroscopy_html' => 'old macroscopy',
        'microscopy_html' => 'old microscopy',
        'comments_notes_html' => 'old comments',
        'protocols_html' => 'old protocols',
        'legend_html' => 'old legend',
    ]);

    $data = [
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => 'new clinical',
        'diagnosis_html' => 'new diagnosis',
        'macroscopy_html' => 'new macroscopy',
        'microscopy_html' => 'new microscopy',
        'comments_notes_html' => 'new comments',
        'protocols_html' => 'new protocols',
        'legend_html' => 'new legend',
    ];

    $response = $this->actingAs($this->admin)
        ->put(route('specimen-type-templates.update', $template->id), $data);

    $response->assertRedirect();
    $template->refresh();
    expect($template->clinical_details_html)->toBe('new clinical')
        ->and($template->diagnosis_html)->toBe('new diagnosis')
        ->and($template->macroscopy_html)->toBe('new macroscopy');
});

test('admin can delete specimen type template', function () {
    $template = SpecimenTypeTemplate::create([
        'user_id' => $this->user->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination1->id,
        'clinical_details_html' => 'clinical',
        'diagnosis_html' => 'diagnosis',
        'macroscopy_html' => 'macroscopy',
        'microscopy_html' => 'microscopy',
        'comments_notes_html' => 'comments',
        'protocols_html' => 'protocols',
        'legend_html' => 'legend',
    ]);

    $response = $this->actingAs($this->admin)
        ->delete(route('specimen-type-templates.destroy', $template->id));

    $response->assertRedirect();
    expect(SpecimenTypeTemplate::count())->toBe(0);
});
