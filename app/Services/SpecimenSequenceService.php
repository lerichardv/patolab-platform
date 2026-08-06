<?php

namespace App\Services;

use App\Models\CaiRange;
use App\Models\Sequence;
use App\Models\Specimen;
use Illuminate\Support\Facades\DB;

class SpecimenSequenceService
{
    /**
     * Reserve and return the next single code for a given Specimen Type atomically.
     */
    public static function reserveNextCode(int $specimenTypeId, ?int $locationId = null): string
    {
        return DB::transaction(function () use ($specimenTypeId, $locationId) {
            if (! $locationId) {
                $caiRange = CaiRange::where('status', 'active')->lockForUpdate()->first();
                if (! $caiRange) {
                    throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
                }
                $locationId = $caiRange->location_id;
            }

            $sequence = Sequence::where('location_id', $locationId)
                ->where('specimen_type', $specimenTypeId)
                ->where('active', true)
                ->lockForUpdate()
                ->first();

            if (! $sequence) {
                throw new \Exception('No hay una secuencia de numeración activa configurada para esta sucursal y tipo de muestra.');
            }

            $currentMonth = now()->format('m');
            $currentYear = now()->format('Y');

            do {
                $paddedSeq = str_pad($sequence->current_sequence, $sequence->fill ?? 4, '0', STR_PAD_LEFT);
                $paddedMonth = str_pad($currentMonth, 2, '0', STR_PAD_LEFT);
                $sequenceCode = $sequence->prefix.$sequence->separator.$paddedSeq.$sequence->separator.$paddedMonth.$sequence->separator.$currentYear;

                $exists = Specimen::where('sequence_code', $sequenceCode)->exists();
                if ($exists) {
                    $sequence->increment('current_sequence');
                }
            } while ($exists);

            $sequence->increment('current_sequence');

            return $sequenceCode;
        });
    }
}
