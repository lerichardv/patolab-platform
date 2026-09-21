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

            $resolvedFrom = self::normalizeDate($from, $to);
            $resolvedTo = self::normalizeDate($to, $from);

            if (! empty($resolvedFrom) && ! empty($resolvedTo) && $resolvedFrom > $resolvedTo) {
                [$resolvedFrom, $resolvedTo] = [$resolvedTo, $resolvedFrom];
            }

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
                $decodedFrom = self::normalizeDate($decoded['from'] ?? '', $decoded['to'] ?? '');
                $decodedTo = self::normalizeDate($decoded['to'] ?? '', $decoded['from'] ?? '');

                // If legacy cookie without 'range' key, determine it from 'from' and 'to'
                if ($range === null) {
                    $range = self::determineRange($decodedFrom, $decodedTo, $today);
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
     * Normalize various date input formats into standard Y-m-d.
     * Handles YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, slashed versions, and "today".
     */
    public static function normalizeDate(?string $date, ?string $pairedDate = null): string
    {
        if ($date === null || trim($date) === '') {
            return '';
        }

        $date = trim($date);

        if ($date === 'today') {
            return Carbon::today()->toDateString();
        }

        // 1. Standard ISO YYYY-MM-DD
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $matches)) {
            $y = (int) $matches[1];
            $m = (int) $matches[2];
            $d = (int) $matches[3];
            if (checkdate($m, $d, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $m, $d);
            }
        }

        // 2. YYYY/MM/DD or with timestamps (e.g. ISO 8601 YYYY-MM-DDTHH:mm:ss)
        if (preg_match('/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/', $date, $matches)) {
            $y = (int) $matches[1];
            $m = (int) $matches[2];
            $d = (int) $matches[3];
            if (checkdate($m, $d, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $m, $d);
            }
        }

        // 3. 3 components with 4-digit year at end: MM-DD-YYYY or DD-MM-YYYY
        if (preg_match('/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/', $date, $matches)) {
            $p1 = (int) $matches[1];
            $p2 = (int) $matches[2];
            $y = (int) $matches[3];

            // Case A: p1 > 12 means p1 is day, p2 is month (DD-MM-YYYY)
            if ($p1 > 12 && $p2 <= 12) {
                if (checkdate($p2, $p1, $y)) {
                    return sprintf('%04d-%02d-%02d', $y, $p2, $p1);
                }
            }

            // Case B: p2 > 12 means p1 is month, p2 is day (MM-DD-YYYY)
            if ($p2 > 12 && $p1 <= 12) {
                if (checkdate($p1, $p2, $y)) {
                    return sprintf('%04d-%02d-%02d', $y, $p1, $p2);
                }
            }

            // Case C: Both <= 12 -> use paired date context to disambiguate
            if (! empty($pairedDate) && preg_match('/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/', trim($pairedDate), $pm)) {
                $pp1 = (int) $pm[1];
                $pp2 = (int) $pm[2];

                // If paired date had p2 > 12 (MM-DD-YYYY), this one is also MM-DD-YYYY
                if ($pp2 > 12 && $pp1 <= 12) {
                    if (checkdate($p1, $p2, $y)) {
                        return sprintf('%04d-%02d-%02d', $y, $p1, $p2);
                    }
                }

                // If paired date had p1 > 12 (DD-MM-YYYY), this one is also DD-MM-YYYY
                if ($pp1 > 12 && $pp2 <= 12) {
                    if (checkdate($p2, $p1, $y)) {
                        return sprintf('%04d-%02d-%02d', $y, $p2, $p1);
                    }
                }

                // If first component is identical (e.g. 08-01-2026 to 08-10-2026), 08 is the common month
                if ($p1 === $pp1 && $p2 !== $pp2) {
                    if (checkdate($p1, $p2, $y)) {
                        return sprintf('%04d-%02d-%02d', $y, $p1, $p2);
                    }
                }
            }

            // Default fallback for ambiguous 3-component: try MM-DD-YYYY first then DD-MM-YYYY
            if (checkdate($p1, $p2, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $p1, $p2);
            }
            if (checkdate($p2, $p1, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $p2, $p1);
            }
        }

        // 4. General Carbon parse fallback
        try {
            return Carbon::parse($date)->toDateString();
        } catch (\Throwable $e) {
            return '';
        }
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

        $resolvedFrom = self::normalizeDate($from, $to);
        $resolvedTo = self::normalizeDate($to, $from);

        if ($range === null) {
            $range = self::determineRange($resolvedFrom, $resolvedTo, $today);
        }

        $cookieTo = ($resolvedTo === $todayStr) ? 'today' : $resolvedTo;

        return cookie(
            $cookieName,
            json_encode([
                'range' => $range,
                'from' => $resolvedFrom,
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
