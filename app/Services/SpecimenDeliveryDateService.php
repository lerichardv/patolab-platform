<?php

namespace App\Services;

use App\Models\SpecimenCategory;
use Carbon\Carbon;

class SpecimenDeliveryDateService
{
    /**
     * Calculate estimated delivery date excluding weekends (business days).
     *
     * Matches the frontend calculation service:
     * resources/js/services/specimen-delivery-date.ts (addWithoutWeekends).
     */
    public static function calculate(?SpecimenCategory $category, Carbon|string|null $startDate = null): ?Carbon
    {
        if (! $category || ! $category->quantity || ! $category->unit) {
            return null;
        }

        return self::calculateDuration($startDate, (int) $category->quantity, (string) $category->unit);
    }

    /**
     * Calculate delivery date given a start date, duration quantity, and unit.
     */
    public static function calculateDuration(Carbon|string|null $startDate, int $quantity, string $unit): Carbon
    {
        $date = $startDate ? Carbon::parse($startDate)->copy() : Carbon::now();
        $unit = strtolower(trim($unit));

        if ($quantity <= 0) {
            return $date;
        }

        switch ($unit) {
            case 'minutes':
                $addedMinutes = 0;
                while ($addedMinutes < $quantity) {
                    $date->addMinute();
                    if (! $date->isWeekend()) {
                        $addedMinutes++;
                    }
                }

                return $date;

            case 'hours':
                $addedHours = 0;
                while ($addedHours < $quantity) {
                    $date->addHour();
                    if (! $date->isWeekend()) {
                        $addedHours++;
                    }
                }

                return $date;

            case 'weeks':
                return $date->addWeekdays($quantity * 5);

            case 'days':
            default:
                return $date->addWeekdays($quantity);
        }
    }

    /**
     * Format the estimated delivery date.
     */
    public static function formatEstimatedDate(?Carbon $date, ?string $unit = null): string
    {
        if (! $date) {
            return '';
        }

        if (in_array(strtolower((string) $unit), ['hours', 'minutes'], true)) {
            return $date->format('d/m/Y h:i a');
        }

        return $date->format('d/m/Y');
    }
}
