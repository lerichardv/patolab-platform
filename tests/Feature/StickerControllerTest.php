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
use App\Services\StickerPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

uses(RefreshDatabase::class);

beforeEach(function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $viewPermission = Permission::create(['slug' => 'specimens.view', 'name' => 'Ver Muestras']);
    $role->permissions()->attach($viewPermission);

    $this->user = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create([
        'name' => 'Carlos Herminio Perez Mendoza',
    ]);

    $this->specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Simple',
        'code' => 'BIO',
        'description' => 'Desc',
    ]);
    $this->category = SpecimenCategory::create(['name' => 'Cat', 'quantity' => 1]);
    $this->referrerType = ReferrerType::create(['name' => 'RefType']);
    $this->referrer = Referrer::create([
        'name' => 'Ref Doctor',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);
    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#3b82f6',
        'order' => 1,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'BX-0150-01-12',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'active' => true,
    ]);
});

test('short url route redirects to specimens kanban board with search and view sheet trigger', function () {
    $response = $this->get('/s/BX-0150-01-12');

    $response->assertRedirect('/specimens?search=BX-0150-01-12&specimen=BX-0150-01-12&action=view');
});

test('short url route with unknown code redirects to search', function () {
    $response = $this->get('/s/NON-EXISTENT');

    $response->assertRedirect('/specimens?search=NON-EXISTENT');
});

test('sticker pdf service splits patient names into two balanced lines', function () {
    $service = new StickerPdfService;

    [$l1, $l2] = $service->splitPatientName('Carlos Herminio Perez Mendoza');
    expect($l1)->toBe('Carlos Herminio')
        ->and($l2)->toBe('Perez Mendoza');

    [$l1_2, $l2_2] = $service->splitPatientName('Carlos Perez');
    expect($l1_2)->toBe('Carlos')
        ->and($l2_2)->toBe('Perez');

    [$l1_single, $l2_single] = $service->splitPatientName('Carlos');
    expect($l1_single)->toBe('Carlos')
        ->and($l2_single)->toBe('');
});

test('sticker pdf service formats short patient name for cassette sticker', function () {
    $service = new StickerPdfService;

    expect($service->formatShortPatientName('Carlos Herminio Perez Mendoza'))->toBe('Carlos Perez')
        ->and($service->formatShortPatientName('Carlos Perez'))->toBe('Carlos Perez')
        ->and($service->formatShortPatientName('Carlos'))->toBe('Carlos');
});

test('sticker pdf service generates base64 qr code data uri', function () {
    $service = new StickerPdfService;

    $qr = $service->generateQrCode('https://example.com/s/BX-0150-01-12');
    expect($qr)->toStartWith('data:image/png;base64,');
});

test('specimen sticker endpoint generates pdf and returns proper headers', function () {
    $mockService = Mockery::mock(StickerPdfService::class);
    $mockService->shouldReceive('generateSpecimenStickers')
        ->once()
        ->andReturn('%PDF-1.4 mock pdf content');

    $this->app->instance(StickerPdfService::class, $mockService);

    $response = $this->actingAs($this->user)
        ->postJson('/stickers/specimens', [
            'specimen_ids' => [$this->specimen->id],
            'type' => 'muestra',
            'laboratory_name' => 'Laboratorio Patolab',
            'biopsy_number' => 'BX-2026-0045',
            'marker_name' => 'HER2',
            'cutting_code' => 'A',
        ]);

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
    expect($response->getContent())->toBe('%PDF-1.4 mock pdf content');
});

test('cuttings sticker endpoint generates pdf for specimen cuttings', function () {
    $cuttingCode = CuttingCode::create(['code' => 'M', 'color' => '#ffffff']);
    $cutting = Cutting::create([
        'code_id' => $cuttingCode->id,
        'specimen_id' => $this->specimen->id,
        'status' => 'processing',
        'responsible_id' => $this->user->id,
        'number_of_cuttings' => 1,
        'description' => 'Fragmento único',
        'cuttings_description' => '1x1',
        'is_new_cut' => false,
    ]);

    $mockService = Mockery::mock(StickerPdfService::class);
    $mockService->shouldReceive('generateCassetteStickers')
        ->once()
        ->with(Mockery::type(Collection::class), 'Laboratorio Patolab')
        ->andReturn('%PDF-1.4 cassette pdf content');

    $this->app->instance(StickerPdfService::class, $mockService);

    $response = $this->actingAs($this->user)
        ->postJson('/stickers/cuttings', [
            'cutting_ids' => [$cutting->id],
            'laboratory_name' => 'Laboratorio Patolab',
        ]);

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
    expect($response->getContent())->toBe('%PDF-1.4 cassette pdf content');
});

test('cuttings sticker endpoint generates default cassette stickers when specimens have no cuttings yet', function () {
    $mockService = Mockery::mock(StickerPdfService::class);
    $mockService->shouldReceive('generateCassetteStickers')
        ->once()
        ->with(Mockery::on(function ($items) {
            return $items->count() === 1 && $items->first()['cutting_code'] === 'A';
        }), 'Laboratorio Patolab')
        ->andReturn('%PDF-1.4 cassette pdf content');

    $this->app->instance(StickerPdfService::class, $mockService);

    $response = $this->actingAs($this->user)
        ->postJson('/stickers/cuttings', [
            'specimen_ids' => [$this->specimen->id],
            'laboratory_name' => 'Laboratorio Patolab',
        ]);

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
    expect($response->getContent())->toBe('%PDF-1.4 cassette pdf content');
});
