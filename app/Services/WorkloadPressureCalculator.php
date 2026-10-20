<?php

namespace App\Services;

use App\Models\PathologistExaminationDuration;
use App\Models\Specimen;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WorkloadPressureCalculator
{
    public const DAILY_CAPACITY_MINUTES = 480; // 8 labor hours = 480 minutes

    public const DEFAULT_EXAM_DURATION_MINUTES = 30; // 30 minutes fallback per examination

    /**
     * Get a map of configured examination durations for pathologists:
     * [ user_id => [ examination_id => duration_minutes ] ]
     */
    public static function getDurationsMap(?array $userIds = null): array
    {
        $query = PathologistExaminationDuration::query();

        if (! empty($userIds)) {
            $query->whereIn('user_id', $userIds);
        }

        $durations = $query->get(['user_id', 'specimen_type_examination_id', 'duration_minutes']);

        $map = [];
        foreach ($durations as $d) {
            $map[$d->user_id][$d->specimen_type_examination_id] = (int) $d->duration_minutes;
        }

        return $map;
    }

    /**
     * Calculate duration in minutes for a single specimen for a specific pathologist.
     */
    public static function getSpecimenDuration(Specimen $specimen, int $userId, array $durationsMap = []): int
    {
        $examIds = [];

        if ($specimen->relationLoaded('examinations') && $specimen->examinations->isNotEmpty()) {
            $examIds = $specimen->examinations->pluck('id')->toArray();
        } elseif ($specimen->specimen_type_examination) {
            $examIds = [$specimen->specimen_type_examination];
        }

        if (empty($examIds)) {
            return self::DEFAULT_EXAM_DURATION_MINUTES;
        }

        $totalMinutes = 0;
        foreach ($examIds as $examId) {
            $minutes = $durationsMap[$userId][$examId] ?? self::DEFAULT_EXAM_DURATION_MINUTES;
            $totalMinutes += (int) $minutes;
        }

        return $totalMinutes;
    }

    /**
     * Calculate daily workload pressure for a list of specimens assigned to a pathologist.
     */
    public static function calculateDailyWorkload(
        Collection|array $specimens,
        int $userId,
        array $durationsMap = []
    ): array {
        $specimenCollection = $specimens instanceof Collection ? $specimens : collect($specimens);
        $totalMinutes = 0;

        foreach ($specimenCollection as $specimen) {
            $totalMinutes += self::getSpecimenDuration($specimen, $userId, $durationsMap);
        }

        $hours = round($totalMinutes / 60, 1);
        $capacity = self::DAILY_CAPACITY_MINUTES;
        $percentage = $capacity > 0 ? (int) round(($totalMinutes / $capacity) * 100) : 0;

        // Thresholds: Green <= 70% (5.6h), Yellow 71-100% (5.6h-8.0h), Red > 100% (>8.0h)
        if ($totalMinutes <= 336) { // <= 70% of 480
            $color = 'green';
            $colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800';
            $progressClass = 'bg-emerald-500';
            $label = 'Óptima';
        } elseif ($totalMinutes <= self::DAILY_CAPACITY_MINUTES) { // 71% - 100%
            $color = 'yellow';
            $colorClass = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800';
            $progressClass = 'bg-amber-500';
            $label = 'Capacidad límite';
        } else { // > 100%
            $color = 'red';
            $colorClass = 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800 animate-pulse';
            $progressClass = 'bg-red-500';
            $label = 'Sobrecarga';
        }

        return [
            'total_minutes' => $totalMinutes,
            'hours' => $hours,
            'percentage' => $percentage,
            'color' => $color,
            'color_class' => $colorClass,
            'progress_class' => $progressClass,
            'label' => $label,
            'specimen_count' => $specimenCollection->count(),
            'formatted_time' => "{$hours}h / 8.0h",
        ];
    }

    /**
     * Calculate business days (weekdays) between a start date and a target date.
     */
    public static function calculateWeekdays(Carbon|string $startDate, Carbon|string $targetDate): int
    {
        $start = Carbon::parse($startDate)->copy();
        $target = Carbon::parse($targetDate)->copy();

        if ($target->format('Y-m-d') <= $start->format('Y-m-d')) {
            return 1;
        }

        $weekdays = 0;
        $current = $start->copy();

        while ($current->format('Y-m-d') < $target->format('Y-m-d')) {
            $current->addDay();
            if (! $current->isWeekend()) {
                $weekdays++;
            }
        }

        return max(1, $weekdays);
    }
}
