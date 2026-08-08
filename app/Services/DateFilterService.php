<?php

namespace App\Services;

use Carbon\Carbon;

class DateFilterService
{
    /**
     * Resolve the date range from request or cookie.
     *
     * @param  string|null  $cookieValue  The raw cookie string.
     * @param  string|null  $reqFrom  The date_from query parameter.
     * @param  string|null  $reqTo  The date_to query parameter.
     * @return array{from: string, to: string, range: string}
     */
    public static function resolveFilter(?string $cookieValue, ?string $reqFrom, ?string $reqTo): array
    {
        $today = Carbon::today();

        // 1. If explicit query parameters are provided, prioritize them
        if ($reqFrom !== null || $reqTo !== null) {
            $from = $reqFrom ?? '';
            $to = $reqTo ?? '';

            $resolvedTo = ($to === 'today') ? $today->toDateString() : $to;
            $resolvedFrom = ($from === 'today') ? $today->toDateString() : $from;

            $range = self::determineRange($resolvedFrom, $resolvedTo, $today);

            return [
                'from' => $resolvedFrom,
                'to' => $resolvedTo,
                'range' => $range,
            ];
        }

        // 2. Otherwise, fallback to the cookie value
        if ($cookieValue) {
            $decoded = json_decode($cookieValue, true);
            if (is_array($decoded)) {
                $range = $decoded['range'] ?? null;
                $decodedFrom = $decoded['from'] ?? '';
                $decodedTo = $decoded['to'] ?? '';

                // If legacy cookie without 'range' key, determine it from 'from' and 'to'
                if ($range === null) {
                    $resolvedTo = ($decodedTo === 'today') ? $today->toDateString() : $decodedTo;
                    $resolvedFrom = ($decodedFrom === 'today') ? $today->toDateString() : $decodedFrom;
                    $range = self::determineRange($resolvedFrom, $resolvedTo, $today);
                }

                if ($decodedTo === 'today') {
                    $decodedTo = $today->toDateString();
                }
                if ($decodedFrom === 'today') {
                    $decodedFrom = $today->toDateString();
                }

                switch ($range) {
                    case 'today':
                        return [
                            'from' => $today->toDateString(),
                            'to' => $today->toDateString(),
                            'range' => 'today',
                        ];
                    case 'this_week':
                        return [
                            'from' => $today->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
                            'to' => $today->copy()->endOfWeek(Carbon::SUNDAY)->toDateString(),
                            'range' => 'this_week',
                        ];
                    case '7_days':
                        return [
                            'from' => $today->copy()->subDays(7)->toDateString(),
                            'to' => $today->toDateString(),
                            'range' => '7_days',
                        ];
                    case '14_days':
                        return [
                            'from' => $today->copy()->subDays(14)->toDateString(),
                            'to' => $today->toDateString(),
                            'range' => '14_days',
                        ];
                    case '30_days':
                        return [
                            'from' => $today->copy()->subDays(30)->toDateString(),
                            'to' => $today->toDateString(),
                            'range' => '30_days',
                        ];
                    case 'all':
                        return [
                            'from' => '',
                            'to' => '',
                            'range' => 'all',
                        ];
                    case 'custom':
                    default:
                        return [
                            'from' => $decodedFrom,
                            'to' => $decodedTo,
                            'range' => $range ?? 'custom',
                        ];
                }
            }
        }

        // 3. Absolute default: last 14 days
        return [
            'from' => $today->copy()->subDays(14)->toDateString(),
            'to' => $today->toDateString(),
            'range' => '14_days',
        ];
    }

    /**
     * Helper to determine range name from raw dates.
     */
    public static function determineRange(string $from, string $to, Carbon $today): string
    {
        if (empty($from) && empty($to)) {
            return 'all';
        }

        $todayStr = $today->toDateString();
        $startOfWeekStr = $today->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
        $endOfWeekStr = $today->copy()->endOfWeek(Carbon::SUNDAY)->toDateString();

        if ($from === $todayStr && $to === $todayStr) {
            return 'today';
        }
        if ($from === $startOfWeekStr && $to === $endOfWeekStr) {
            return 'this_week';
        }
        if ($from === $today->copy()->subDays(7)->toDateString() && $to === $todayStr) {
            return '7_days';
        }
        if ($from === $today->copy()->subDays(14)->toDateString() && $to === $todayStr) {
            return '14_days';
        }
        if ($from === $today->copy()->subDays(30)->toDateString() && $to === $todayStr) {
            return '30_days';
        }

        return 'custom';
    }

    /**
     * Create a queued cookie instance with unified JSON format.
     */
    public static function getCookieToQueue(string $cookieName, string $from, string $to, ?string $range = null)
    {
        $today = Carbon::today();
        $todayStr = $today->toDateString();

        $resolvedTo = ($to === 'today') ? $todayStr : $to;
        $resolvedFrom = ($from === 'today') ? $todayStr : $from;

        if ($range === null) {
            $range = self::determineRange($resolvedFrom, $resolvedTo, $today);
        }

        $cookieTo = ($resolvedTo === $todayStr) ? 'today' : $to;

        return cookie(
            $cookieName,
            json_encode([
                'range' => $range,
                'from' => $from,
                'to' => $cookieTo,
            ]),
            525600, // 1 year
            null,
            null,
            null,
            false // not httpOnly so JS can read/write it
        );
    }
}
