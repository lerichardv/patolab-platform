<?php

namespace App\Services;

use App\Models\Credit;
use App\Models\InvoiceSpecimen;
use App\Models\Specimen;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeState;
use App\Models\UserCommission;
use App\Models\UserCommissionRule;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class SpecimenStatusService
{
    /**
     * Get all configured states for a given specimen type, ordered by step_order.
     *
     * @param  SpecimenType|int|null  $specimenType
     */
    public function getStatesForType($specimenType): Collection
    {
        $typeId = $specimenType instanceof SpecimenType ? $specimenType->id : $specimenType;

        if (! $typeId) {
            return $this->getDefaultSystemStates();
        }

        $states = SpecimenTypeState::where('specimen_type_id', $typeId)
            ->orderBy('step_order')
            ->get();

        if ($states->isEmpty()) {
            return $this->getDefaultSystemStates();
        }

        return $states;
    }

    /**
     * Get only active states for a given specimen type, ordered by step_order.
     *
     * @param  SpecimenType|int|null  $specimenType
     */
    public function getAvailableStatesForType($specimenType): Collection
    {
        $states = $this->getStatesForType($specimenType);

        $active = $states->where('active', true)->values();

        return $active->isNotEmpty() ? $active : $this->getDefaultSystemStates();
    }

    /**
     * Get the initial status for a specimen type (active status with lowest step_order, excluding cancelled).
     *
     * @param  SpecimenType|int|null  $specimenType
     */
    public function getInitialStatus($specimenType): string
    {
        $available = $this->getAvailableStatesForType($specimenType);

        $initial = $available->first(fn ($state) => ($state->status ?? $state['status']) !== 'cancelled');

        if ($initial) {
            return is_array($initial) ? $initial['status'] : $initial->status;
        }

        return 'received';
    }

    /**
     * Calculate the next logical status for a specimen based on its type's active states.
     */
    public function getNextStatus(Specimen $specimen): ?string
    {
        $currentStatus = $specimen->status;

        // Terminal states cannot advance
        if (in_array($currentStatus, ['cancelled', 'delivered'])) {
            return null;
        }

        $available = $this->getAvailableStatesForType($specimen->specimen_type);

        // Filter out cancelled since it is a lateral state
        $flow = $available->filter(fn ($s) => ($s->status ?? $s['status']) !== 'cancelled')->values();

        $currentIndex = $flow->search(fn ($s) => ($s->status ?? $s['status']) === $currentStatus);

        if ($currentIndex === false) {
            // Current status was disabled or not in flow; find first active state with higher order if possible
            // or fallback to next system state
            return $this->findFallbackNextStatus($currentStatus, $flow);
        }

        // Return next state in flow if exists
        if ($currentIndex + 1 < $flow->count()) {
            $next = $flow->get($currentIndex + 1);

            return is_array($next) ? $next['status'] : $next->status;
        }

        return null;
    }

    /**
     * Check if a specimen can transition to a target status according to its specimen type configuration.
     */
    public function canTransitionTo(Specimen $specimen, string $targetStatus): bool
    {
        // Cancelled is always an allowed transition unless already cancelled
        if ($targetStatus === 'cancelled') {
            return $specimen->status !== 'cancelled';
        }

        $available = $this->getAvailableStatesForType($specimen->specimen_type);

        return $available->contains(fn ($s) => ($s->status ?? $s['status']) === $targetStatus);
    }

    /**
     * Get metadata definition for a given status.
     */
    public function getStatusMetadata(string $status): array
    {
        return SpecimenTypeState::ALL_STATUSES[$status] ?? [
            'label' => ucfirst(str_replace('_', ' ', $status)),
            'color' => '#cbd5e1',
            'description' => '',
        ];
    }

    /**
     * Fallback collection of all system default states.
     */
    public function getDefaultSystemStates(): Collection
    {
        $order = 1;
        $items = [];

        foreach (SpecimenTypeState::ALL_STATUSES as $key => $meta) {
            $items[] = (object) [
                'status' => $key,
                'step_order' => $order++,
                'active' => true,
                'label' => $meta['label'],
                'color' => $meta['color'],
                'description' => $meta['description'],
            ];
        }

        return collect($items);
    }

    /**
     * Transition a specimen to a new target status.
     * Centralizes validation, report timestamp handling, finalization (QR, PDF, commissions, WhatsApp),
     * and cancellation logic.
     *
     * @param  array  $options  Optional parameters (e.g. cancellation_reason, user, bypass_validation)
     *
     * @throws ValidationException
     */
    public function transition(Specimen $specimen, string $targetStatus, array $options = []): Specimen
    {
        $bypassValidation = $options['bypass_validation'] ?? false;
        if (! $bypassValidation && ! $this->canTransitionTo($specimen, $targetStatus)) {
            throw ValidationException::withMessages([
                'status' => ['El estado solicitado no está habilitado para el tipo de muestra actual.'],
            ]);
        }

        $user = $options['user'] ?? auth()->user();

        if ($targetStatus === 'finalized') {
            if ($user && ! $user->can('specimens.finalize')) {
                throw ValidationException::withMessages([
                    'error' => ['No tienes permiso para finalizar el reporte de esta muestra.'],
                ]);
            }

            $unsignedUsers = $specimen->users()->where(function ($q) {
                $q->whereNull('user_signature')->orWhere('user_signature', '');
            })->get();

            if ($unsignedUsers->isNotEmpty()) {
                $names = $unsignedUsers->pluck('name')->implode(', ');
                throw ValidationException::withMessages([
                    'error' => ["No se puede finalizar el reporte porque los siguientes patólogos no han definido su firma: {$names}."],
                ]);
            }
        }

        if ($targetStatus === 'cancelled' && empty($options['cancellation_reason'])) {
            throw ValidationException::withMessages([
                'cancellation_reason' => ['El motivo de cancelación es obligatorio.'],
            ]);
        }

        DB::transaction(function () use ($specimen, $targetStatus, $options, $user) {
            $report = $specimen->report;
            $reportData = [];

            if ($targetStatus === 'processing') {
                $reportData['macroscopy_finalization_datetime'] = now();
            } elseif ($targetStatus === 'microscopic_review') {
                $reportData['microscopy_finalization_datetime'] = now();
            } elseif ($targetStatus === 'finalized') {
                $reportData['report_finalization_datetime'] = now();
                if ($report) {
                    if ($report->auto_finalization_date || empty($report->finalization_date)) {
                        $reportData['finalization_date'] = now()->format('Y-m-d');
                    }
                    $reportData['auto_finalization_date'] = false;
                }
            }

            if ($report && ! empty($reportData)) {
                $report->update($reportData);
            }

            $specimenUpdate = [
                'status' => $targetStatus,
            ];

            $dateColumn = Specimen::STATUS_DATE_COLUMNS[$targetStatus] ?? null;
            if ($dateColumn) {
                $specimenUpdate[$dateColumn] = now();
            }

            if ($targetStatus === 'cancelled') {
                $specimenUpdate['cancellation_reason'] = $options['cancellation_reason'] ?? null;
                $specimenUpdate['cancelled_at'] = now();
                $specimenUpdate['cancelled_by_id'] = $user ? $user->id : auth()->id();

                $this->handleCancellationSideEffects($specimen);
            }

            $specimen->update($specimenUpdate);

            if ($targetStatus === 'finalized' && $report) {
                $report->ensureValidationQrCode();

                try {
                    app(ReportPdfService::class)->generateAndStoreReport($specimen);
                } catch (\Throwable $e) {
                    Log::warning('Error generating PDF for specimen '.$specimen->sequence_code.': '.$e->getMessage());
                }

                $this->calculateCommissions($specimen);

                $this->sendFinalizationWhatsAppNotification($specimen);
            }
        });

        return $specimen->fresh();
    }

    /**
     * Handle cancellation side effects like cancelling invoice and deleting credit.
     */
    protected function handleCancellationSideEffects(Specimen $specimen): void
    {
        $allIds = [$specimen->id];
        if ($specimen->is_group && $specimen->group_id) {
            $groupSpecimenIds = Specimen::where('group_id', $specimen->group_id)->pluck('id')->toArray();
            $allIds = array_unique(array_merge($allIds, $groupSpecimenIds));
        }

        $invoicesToRegenerate = [];
        foreach ($allIds as $id) {
            $spec = Specimen::find($id);
            if (! $spec) {
                continue;
            }

            $invoice = $spec->invoiceRelation;
            if (! $invoice && $spec->is_group && $spec->group) {
                $invoice = $spec->group->invoice;
            }

            if ($invoice) {
                $invoice->update([
                    'invoice_type' => 'cancelled',
                ]);
                $invoicesToRegenerate[$invoice->id] = $invoice;
            }

            $credit = Credit::where('specimen_id', $spec->id)->first();
            if (! $credit && $spec->is_group && $spec->group_id) {
                $credit = Credit::where('group_id', $spec->group_id)->first();
            }

            if ($credit) {
                $credit->delete();
            }
        }

        foreach ($invoicesToRegenerate as $invoiceToRegen) {
            try {
                app(InvoicePdfService::class)->generateAndStoreInvoice($invoiceToRegen);
            } catch (\Exception $e) {
                Log::warning('Error regenerating invoice PDF during specimen cancellation: '.$e->getMessage());
            }
        }
    }

    /**
     * Calculate and store pathologist commissions when the report is finalized.
     */
    public function calculateCommissions(Specimen $specimen): void
    {
        // 1. Get all assigned pathologists
        $assignedUsers = $specimen->users()->withPivot(['macroscopy_access', 'microscopy_access'])->get();

        // 2. Filter pathologists with macroscopy access
        $macroUsers = $assignedUsers->filter(function ($user) {
            return (bool) $user->pivot->macroscopy_access;
        });

        // 3. Filter pathologists with microscopy access
        $microUsers = $assignedUsers->filter(function ($user) {
            return (bool) $user->pivot->microscopy_access;
        });

        // 4. Calculate base amount for the specimen
        $baseAmount = 0.00;
        if ($specimen->is_group || ! empty($specimen->group_id)) {
            $groupSpecimen = InvoiceSpecimen::where('specimen_id', $specimen->id)->first();
            if ($groupSpecimen) {
                $baseAmount = (float) $groupSpecimen->total;
            }
        } else {
            $invoice = $specimen->invoiceRelation;
            if ($invoice) {
                $baseAmount = (float) $invoice->total;
            }
        }

        // 5. Macroscopy commission: for all pathologists with macroscopy access
        foreach ($macroUsers as $macroUser) {
            $rule = UserCommissionRule::where('user_id', $macroUser->id)
                ->where('specimen_type_id', $specimen->specimen_type)
                ->where('specimen_type_examination_id', $specimen->specimen_type_examination)
                ->first();

            if ($rule && $rule->macroscopy_commission_enabled) {
                $commissionAmount = 0.00;
                if ($rule->macroscopy_calculation_type === 'fixed') {
                    $commissionAmount = (float) $rule->macroscopy_commission_value;
                } elseif ($rule->macroscopy_calculation_type === 'percentage') {
                    $commissionAmount = ($baseAmount * (float) $rule->macroscopy_commission_value) / 100.00;
                }

                UserCommission::updateOrCreate(
                    [
                        'user_id' => $macroUser->id,
                        'specimen_id' => $specimen->id,
                        'phase' => 'macroscopy',
                    ],
                    [
                        'user_commission_rule_id' => $rule->id,
                        'specimen_base_amount' => $baseAmount,
                        'calculated_comission_amount' => $commissionAmount,
                        'user_commission_rule_applied' => $rule->toArray(),
                        'created_by' => auth()->id() ?? $macroUser->id,
                        'updated_by' => auth()->id(),
                    ]
                );
            }
        }

        // 6. Microscopy commission: for all pathologists with microscopy access
        $microCount = $microUsers->count();
        foreach ($microUsers as $microUser) {
            $rule = UserCommissionRule::where('user_id', $microUser->id)
                ->where('specimen_type_id', $specimen->specimen_type)
                ->where('specimen_type_examination_id', $specimen->specimen_type_examination)
                ->first();

            if ($rule && $rule->microscopy_commission_enabled) {
                $commissionAmount = 0.00;
                if ($rule->microscopy_calculation_type === 'fixed') {
                    $commissionAmount = (float) $rule->microscopy_commission_value;
                } elseif ($rule->microscopy_calculation_type === 'percentage') {
                    $commissionAmount = ($baseAmount * (float) $rule->microscopy_commission_value) / 100.00;
                }

                if ($microCount > 1) {
                    $commissionAmount = $commissionAmount / $microCount;
                }

                UserCommission::updateOrCreate(
                    [
                        'user_id' => $microUser->id,
                        'specimen_id' => $specimen->id,
                        'phase' => 'microscopy',
                    ],
                    [
                        'user_commission_rule_id' => $rule->id,
                        'specimen_base_amount' => $baseAmount,
                        'calculated_comission_amount' => $commissionAmount,
                        'user_commission_rule_applied' => $rule->toArray(),
                        'created_by' => auth()->id() ?? $microUser->id,
                        'updated_by' => auth()->id(),
                    ]
                );
            }
        }
    }

    /**
     * Send WhatsApp notification when specimen is finalized.
     */
    protected function sendFinalizationWhatsAppNotification(Specimen $specimen): void
    {
        try {
            $customer = $specimen->customerRelation;
            if ($customer) {
                $link = route('specimens.show-public', [
                    'specimen_code' => $specimen->sequence_code,
                    'token' => $specimen->access_token,
                    'delivery_token' => $specimen->delivery_token,
                ]);
                $patientName = $customer->name;
                $message = "Hola, {$patientName}. El reporte de su muestra con código {$specimen->sequence_code} ha sido finalizado. Puede ver el progreso y descargar su reporte en el siguiente enlace: {$link}";

                $phone = $customer->phone;
                $cleanPhone = preg_replace('/\D/', '', $phone ?? '');
                if (strlen($cleanPhone) === 8) {
                    $cleanPhone = '504'.$cleanPhone;
                }

                if (config('app.env') !== 'production') {
                    $cleanPhone = '50433666885';
                }

                if (! empty($cleanPhone)) {
                    $whatsapp = app(WhatsAppService::class);
                    $whatsapp->sendText($cleanPhone, $message);
                }

                Log::info('WhatsApp de finalización de reporte enviado: '.$message);
            }
        } catch (\Exception $e) {
            Log::error('Error enviando notificación de WhatsApp de finalización: '.$e->getMessage());
        }
    }

    private function findFallbackNextStatus(string $currentStatus, Collection $flow): ?string
    {
        $canonicalOrder = [
            'received' => 1,
            'macroscopic_review' => 2,
            'processing' => 3,
            'microscopic_review' => 4,
            'finalized' => 5,
            'delivered' => 6,
        ];

        $currentCanonical = $canonicalOrder[$currentStatus] ?? 0;

        $next = $flow->first(function ($s) use ($canonicalOrder, $currentCanonical) {
            $status = $s->status ?? $s['status'];
            $order = $canonicalOrder[$status] ?? 0;

            return $order > $currentCanonical;
        });

        if ($next) {
            return is_array($next) ? $next['status'] : $next->status;
        }

        return null;
    }
}
