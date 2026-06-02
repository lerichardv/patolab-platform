<?php

use App\Models\User;
use App\Models\Location;
use App\Models\CaiRange;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    
    $this->location = Location::create([
        'name' => 'Sucursal Principal',
        'rtn' => '12345678901234',
        'address' => 'Tegucigalpa',
        'phone' => '2222-2222',
        'email' => 'principal@patolab.com',
        'active' => true,
    ]);
});

test('guest cannot access cai-ranges page', function () {
    $this->get(route('cai-ranges.index'))->assertRedirect(route('login'));
});

test('opening the table updates expired CAI ranges to expired', function () {
    $this->actingAs($this->user);

    $expiredRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'ABCDEF-123456-ABCDEF-123456-ABCDEF-12',
        'full_prefix' => '000-001-01-',
        'emission' => '2026-01-01',
        'establishment' => '000',
        'document_type' => 'factura',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => today()->subDay()->toDateString(), // Expired yesterday
        'status' => 'active',
        'limit_percentage_warning' => 10,
        'limit_days_warning' => 10,
        'warning_notifications_amount' => 3,
        'warning_notifications_sent' => 0,
    ]);

    // Send request to index
    $response = $this->get(route('cai-ranges.index'));
    $response->assertOk();

    // Verify it was updated to expired
    $expiredRange->refresh();
    expect($expiredRange->status)->toBe('expired');
});

test('opening the table updates exhausted CAI ranges to exhausted', function () {
    $this->actingAs($this->user);

    $exhaustedRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'ABCDEF-123456-ABCDEF-123456-ABCDEF-34',
        'full_prefix' => '000-001-01-',
        'emission' => '2026-01-01',
        'establishment' => '000',
        'document_type' => 'factura',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 1000, // Exhausted
        'deadline' => today()->addDays(30)->toDateString(),
        'status' => 'active',
        'limit_percentage_warning' => 10,
        'limit_days_warning' => 10,
        'warning_notifications_amount' => 3,
        'warning_notifications_sent' => 0,
    ]);

    // Send request to index
    $response = $this->get(route('cai-ranges.index'));
    $response->assertOk();

    // Verify it was updated to exhausted
    $exhaustedRange->refresh();
    expect($exhaustedRange->status)->toBe('exhausted');
});
