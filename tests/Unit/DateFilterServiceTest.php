<?php

use App\Services\DateFilterService;
use Carbon\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-07-28 12:00:00'); // Tuesday
});

afterEach(function () {
    Carbon::setTestNow();
});

test('resolves explicit query parameters', function () {
    $result = DateFilterService::resolveFilter(
        null,
        '2026-07-01',
        '2026-07-15'
    );

    expect($result)->toEqual([
        'from' => '2026-07-01',
        'to' => '2026-07-15',
        'range' => 'custom',
    ]);
});

test('resolves from dynamic cookie ranges', function () {
    // 14 days
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => '14_days']),
        null,
        null
    );
    expect($result)->toEqual([
        'from' => '2026-07-14',
        'to' => '2026-07-28',
        'range' => '14_days',
    ]);

    // 7 days
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => '7_days']),
        null,
        null
    );
    expect($result)->toEqual([
        'from' => '2026-07-21',
        'to' => '2026-07-28',
        'range' => '7_days',
    ]);

    // today
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => 'today']),
        null,
        null
    );
    expect($result)->toEqual([
        'from' => '2026-07-28',
        'to' => '2026-07-28',
        'range' => 'today',
    ]);

    // this week
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => 'this_week']),
        null,
        null
    );
    expect($result)->toEqual([
        'from' => '2026-07-27', // Monday of current week
        'to' => '2026-08-02', // Sunday of current week
        'range' => 'this_week',
    ]);

    // 30 days
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => '30_days']),
        null,
        null
    );
    expect($result)->toEqual([
        'from' => '2026-06-28',
        'to' => '2026-07-28',
        'range' => '30_days',
    ]);

    // all
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => 'all']),
        null,
        null
    );
    expect($result)->toEqual([
        'from' => '',
        'to' => '',
        'range' => 'all',
    ]);
});

test('resolves legacy cookie format without range key', function () {
    $result = DateFilterService::resolveFilter(
        json_encode(['from' => '2026-07-21', 'to' => '2026-07-28']),
        null,
        null
    );

    expect($result)->toEqual([
        'from' => '2026-07-21',
        'to' => '2026-07-28',
        'range' => '7_days',
    ]);
});

test('creates a cookie to queue with range key', function () {
    $cookie = DateFilterService::getCookieToQueue(
        'my_test_cookie',
        '2026-07-21',
        '2026-07-28'
    );

    expect($cookie->getName())->toBe('my_test_cookie');
    $value = json_decode($cookie->getValue(), true);
    expect($value)->toEqual([
        'range' => '7_days',
        'from' => '2026-07-21',
        'to' => 'today',
    ]);
    expect($cookie->isHttpOnly())->toBeFalse();
});

test('resolves cookie with dynamic today end date', function () {
    $result = DateFilterService::resolveFilter(
        json_encode(['range' => 'custom', 'from' => '2026-07-20', 'to' => 'today']),
        null,
        null
    );

    expect($result)->toEqual([
        'from' => '2026-07-20',
        'to' => '2026-07-28', // Carbon test now date
        'range' => 'custom',
    ]);
});

test('resolves explicit today query parameters', function () {
    $result = DateFilterService::resolveFilter(
        null,
        '2026-07-20',
        'today'
    );

    expect($result)->toEqual([
        'from' => '2026-07-20',
        'to' => '2026-07-28',
        'range' => 'custom',
    ]);
});

test('creates a cookie to queue with fixed end date other than today', function () {
    $cookie = DateFilterService::getCookieToQueue(
        'my_test_cookie',
        '2026-07-21',
        '2026-07-27' // yesterday (not today)
    );

    $value = json_decode($cookie->getValue(), true);
    expect($value)->toEqual([
        'range' => 'custom',
        'from' => '2026-07-21',
        'to' => '2026-07-27', // remains a fixed date range
    ]);
});
