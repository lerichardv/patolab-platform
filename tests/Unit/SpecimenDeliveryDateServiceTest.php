<?php

use App\Models\SpecimenCategory;
use App\Services\SpecimenDeliveryDateService;
use Carbon\Carbon;

beforeEach(function () {
    // Wednesday Sept 9, 2026 at 13:24:00
    Carbon::setTestNow('2026-09-09 13:24:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

test('calculates delivery date for days excluding weekends', function () {
    $category = new SpecimenCategory([
        'name' => 'Citologias',
        'quantity' => 7,
        'unit' => 'days',
    ]);

    $result = SpecimenDeliveryDateService::calculate($category, '2026-09-09 13:24:00');

    // 7 weekdays from Wednesday Sept 9 = Friday Sept 18
    expect($result)->not->toBeNull()
        ->and($result->format('Y-m-d H:i:s'))->toBe('2026-09-18 13:24:00');
});

test('calculates delivery date for weeks excluding weekends', function () {
    $category = new SpecimenCategory([
        'name' => 'Complejas',
        'quantity' => 2,
        'unit' => 'weeks',
    ]);

    // 2 weeks = 10 weekdays
    $result = SpecimenDeliveryDateService::calculate($category, '2026-09-09 13:24:00');

    expect($result)->not->toBeNull()
        ->and($result->format('Y-m-d H:i:s'))->toBe('2026-09-23 13:24:00');
});

test('calculates delivery date for hours skipping weekends', function () {
    // Friday Sept 11, 2026 at 20:00:00
    $category = new SpecimenCategory([
        'name' => 'Urgente',
        'quantity' => 10,
        'unit' => 'hours',
    ]);

    $result = SpecimenDeliveryDateService::calculate($category, '2026-09-11 20:00:00');

    // 4 hours on Friday night (to 00:00 Sat), then Sat/Sun skipped, 6 hours on Monday morning = 06:00 Mon Sept 14
    expect($result)->not->toBeNull()
        ->and($result->format('Y-m-d H:i:s'))->toBe('2026-09-14 06:00:00');
});

test('calculates delivery date for minutes skipping weekends', function () {
    $category = new SpecimenCategory([
        'name' => 'Inmediato',
        'quantity' => 30,
        'unit' => 'minutes',
    ]);

    $result = SpecimenDeliveryDateService::calculate($category, '2026-09-09 13:00:00');

    expect($result)->not->toBeNull()
        ->and($result->format('Y-m-d H:i:s'))->toBe('2026-09-09 13:30:00');
});

test('returns null for null category or invalid quantity', function () {
    expect(SpecimenDeliveryDateService::calculate(null))->toBeNull();

    $noQty = new SpecimenCategory(['unit' => 'days', 'quantity' => 0]);
    expect(SpecimenDeliveryDateService::calculate($noQty))->toBeNull();
});

test('formats estimated date properly', function () {
    $date = Carbon::parse('2026-09-18 13:24:00');

    expect(SpecimenDeliveryDateService::formatEstimatedDate($date, 'days'))->toBe('18/09/2026')
        ->and(SpecimenDeliveryDateService::formatEstimatedDate($date, 'hours'))->toBe('18/09/2026 01:24 pm');
});

test('formats delivery duration range string on SpecimenCategory', function () {
    $cat1 = new SpecimenCategory(['quantity' => 1, 'unit' => 'days']);
    $cat2 = new SpecimenCategory(['quantity' => 10, 'unit' => 'days']);
    $cat3 = new SpecimenCategory(['quantity' => 2, 'unit' => 'weeks']);
    $cat4 = new SpecimenCategory(['quantity' => 24, 'unit' => 'hours']);
    $cat5 = new SpecimenCategory(['quantity' => 1, 'unit' => 'hours']);

    expect($cat1->formatted_delivery_duration)->toBe('1 día')
        ->and($cat2->formatted_delivery_duration)->toBe('10 días')
        ->and($cat3->formatted_delivery_duration)->toBe('2 semanas')
        ->and($cat4->formatted_delivery_duration)->toBe('24 horas')
        ->and($cat5->formatted_delivery_duration)->toBe('1 hora');
});
