<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Specimen;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request for the dashboard resume.
     */
    public function __invoke()
    {
        $specimensCount = Specimen::where('active', true)->count();
        $customersCount = Customer::where('active', true)->count();

        $getBillingRowsForRange = function ($dateFrom, $dateTo) {
            $invoices = Invoice::with([
                'customer',
                'specimen.type',
                'specimen.examination',
                'specimen.priority',
                'specimen.customerRelation',
                'groupSpecimens.specimen.type',
                'groupSpecimens.specimen.examination',
                'groupSpecimens.specimen.priority',
                'groupSpecimens.specimen.customerRelation',
                'creditInvoiceSpecimens.specimen.type',
                'creditInvoiceSpecimens.specimen.examination',
                'creditInvoiceSpecimens.specimen.priority',
                'creditInvoiceSpecimens.specimen.customerRelation',
                'createdBy',
            ])
                ->where('invoice_type', '!=', 'cancelled')
                ->where(function ($q) use ($dateFrom, $dateTo) {
                    $q->where(function ($sub) use ($dateFrom, $dateTo) {
                        $sub->where('is_group', false)
                            ->whereHas('specimen', function ($subQ) use ($dateFrom, $dateTo) {
                                $subQ->whereDate('created_at', '>=', $dateFrom)
                                    ->whereDate('created_at', '<=', $dateTo);
                            });
                    })
                        ->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                            $sub->where('is_group', true)
                                ->where('payment_type', 'credit')
                                ->whereHas('creditInvoiceSpecimens.specimen', function ($subQ) use ($dateFrom, $dateTo) {
                                    $subQ->whereDate('created_at', '>=', $dateFrom)
                                        ->whereDate('created_at', '<=', $dateTo);
                                });
                        })
                        ->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                            $sub->where('is_group', true)
                                ->where('payment_type', '!=', 'credit')
                                ->whereHas('groupSpecimens.specimen', function ($subQ) use ($dateFrom, $dateTo) {
                                    $subQ->whereDate('created_at', '>=', $dateFrom)
                                        ->whereDate('created_at', '<=', $dateTo);
                                });
                        });
                })
                ->get();

            $rows = [];
            foreach ($invoices as $invoice) {
                if ($invoice->is_group) {
                    if ($invoice->payment_type === 'credit') {
                        $cisItems = $invoice->creditInvoiceSpecimens;
                        if (! empty($dateFrom)) {
                            $cisItems = $cisItems->filter(fn ($cis) => $cis->specimen && $cis->specimen->created_at && $cis->specimen->created_at->toDateString() >= $dateFrom);
                        }
                        if (! empty($dateTo)) {
                            $cisItems = $cisItems->filter(fn ($cis) => $cis->specimen && $cis->specimen->created_at && $cis->specimen->created_at->toDateString() <= $dateTo);
                        }

                        foreach ($cisItems as $cis) {
                            $rows[] = [
                                'net_amount' => $cis->is_paid ? (float) $cis->total : 0.0,
                                'gross_amount' => (float) $cis->total,
                                'amount' => (float) $cis->amount,
                                'total' => (float) $cis->total,
                                'date' => ($cis->specimen && $cis->specimen->created_at) ? $cis->specimen->created_at->toDateString() : ($cis->created_at ? $cis->created_at->toDateString() : null),
                                'specimen' => $cis->specimen,
                                'payment_type' => $invoice->payment_type,
                                'invoice_id' => $invoice->id,
                                'invoice_date' => $invoice->invoice_date ? $invoice->invoice_date->toDateString() : null,
                                'created_at' => $invoice->created_at ? $invoice->created_at->toDateString() : null,
                            ];
                        }
                    } else {
                        $igsItems = $invoice->groupSpecimens;
                        if (! empty($dateFrom)) {
                            $igsItems = $igsItems->filter(fn ($igs) => $igs->specimen && $igs->specimen->created_at && $igs->specimen->created_at->toDateString() >= $dateFrom);
                        }
                        if (! empty($dateTo)) {
                            $igsItems = $igsItems->filter(fn ($igs) => $igs->specimen && $igs->specimen->created_at && $igs->specimen->created_at->toDateString() <= $dateTo);
                        }

                        foreach ($igsItems as $igs) {
                            $rows[] = [
                                'net_amount' => (float) $igs->total,
                                'gross_amount' => (float) $igs->total,
                                'amount' => (float) $igs->amount,
                                'total' => (float) $igs->total,
                                'date' => ($igs->specimen && $igs->specimen->created_at) ? $igs->specimen->created_at->toDateString() : ($igs->created_at ? $igs->created_at->toDateString() : null),
                                'specimen' => $igs->specimen,
                                'payment_type' => $invoice->payment_type,
                                'invoice_id' => $invoice->id,
                                'invoice_date' => $invoice->invoice_date ? $invoice->invoice_date->toDateString() : null,
                                'created_at' => $invoice->created_at ? $invoice->created_at->toDateString() : null,
                            ];
                        }
                    }
                } else {
                    $rows[] = [
                        'net_amount' => (float) $invoice->total_paid,
                        'gross_amount' => (float) $invoice->total,
                        'amount' => (float) $invoice->amount,
                        'total' => (float) $invoice->total,
                        'date' => ($invoice->specimen && $invoice->specimen->created_at) ? $invoice->specimen->created_at->toDateString() : ($invoice->created_at ? $invoice->created_at->toDateString() : null),
                        'specimen' => $invoice->specimen,
                        'payment_type' => $invoice->payment_type,
                        'invoice_id' => $invoice->id,
                        'invoice_date' => $invoice->invoice_date ? $invoice->invoice_date->toDateString() : null,
                        'created_at' => $invoice->created_at ? $invoice->created_at->toDateString() : null,
                    ];
                }
            }

            return $rows;
        };

        $todayStr = Carbon::today()->toDateString();
        $todayRows = $getBillingRowsForRange($todayStr, $todayStr);
        $moneyMadeToday = collect($todayRows)->sum('net_amount');

        $startOfWeek = Carbon::now()->startOfWeek()->toDateString();
        $endOfWeek = Carbon::now()->endOfWeek()->toDateString();
        $weeklyRows = $getBillingRowsForRange($startOfWeek, $endOfWeek);

        // Group weekly rows by date
        $specimensByDate = [];
        $earningsByDate = [];
        foreach ($weeklyRows as $row) {
            if ($row['date']) {
                if (! isset($specimensByDate[$row['date']])) {
                    $specimensByDate[$row['date']] = 0;
                    $earningsByDate[$row['date']] = 0.0;
                }
                if ($row['specimen']) {
                    $specimensByDate[$row['date']]++;
                }
                $earningsByDate[$row['date']] += $row['net_amount'];
            }
        }

        // Build a complete list of 7 days (Monday to Sunday)
        $weeklyData = [];
        $daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        $startOfWeekCarbon = Carbon::now()->startOfWeek();
        for ($i = 0; $i < 7; $i++) {
            $dateStr = $startOfWeekCarbon->copy()->addDays($i)->toDateString();
            $weeklyData[] = [
                'day' => $daysOfWeek[$i],
                'date' => $dateStr,
                'count' => (int) ($specimensByDate[$dateStr] ?? 0),
                'earnings' => (float) ($earningsByDate[$dateStr] ?? 0.0),
            ];
        }

        $specimensThisWeekCount = collect($weeklyData)->sum('count');

        $todaySpecimens = [];
        foreach ($todayRows as $row) {
            if ($row['specimen']) {
                $specimen = $row['specimen'];
                $specimen->setRelation('invoiceRelation', new Invoice([
                    'id' => $row['invoice_id'],
                    'amount' => $row['amount'],
                    'total' => $row['total'],
                    'total_paid' => $row['net_amount'],
                    'payment_type' => $row['payment_type'],
                    'invoice_date' => $row['invoice_date'] ?? null,
                    'created_at' => $row['created_at'] ?? null,
                ]));
                $todaySpecimens[] = $specimen;
            }
        }

        usort($todaySpecimens, function ($a, $b) {
            return strcmp((string) $b->created_at, (string) $a->created_at);
        });

        return inertia('dashboard', [
            'specimensCount' => $specimensCount,
            'specimensThisWeekCount' => $specimensThisWeekCount,
            'moneyMadeToday' => (float) $moneyMadeToday,
            'customersCount' => $customersCount,
            'specimensWeeklyData' => $weeklyData,
            'todaySpecimens' => $todaySpecimens,
        ]);
    }
}
