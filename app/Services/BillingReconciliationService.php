<?php

namespace App\Services;

use App\Models\Invoice;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BillingReconciliationService
{
    /**
     * Payment method mapping to numerical codes used in accounting cuadre.
     */
    const PAYMENT_CODES = [
        'cash' => 1,
        'check' => 2,
        'card' => 3,
        'credit card' => 3,
        'transfer' => 4,
        'bank transfer' => 4,
        'credit' => 5,
    ];

    const PAYMENT_LABELS = [
        1 => 'Efectivo',
        2 => 'Cheque',
        3 => 'T/C POS',
        4 => 'Transferencia',
        5 => 'Crédito',
    ];

    /**
     * Calculate reconciled fiscal amounts and presentation data for a single invoice.
     *
     * In Honduran SAR accounting:
     * Total Ventas = Gravadas (Gross) + Exentas (Gross) - Descuentos + IVA (15%)
     * Valor Factura (Gross) - Descuento = Pago Recibido (Net)
     *
     * In the database, exempt_amount and taxable_amount_15 are stored as net amounts
     * (after discount). To prevent double discount deduction, Gravadas and Exentas
     * are computed as pre-discount gross amounts.
     */
    public function calculateInvoiceRow(Invoice $invoice, int $itemIndex = 1, ?Carbon $day = null): array
    {
        $isCancelled = ($invoice->invoice_type === 'cancelled');
        $invoiceNum = $invoice->full_invoice_number ?: (string) $invoice->invoice_number;

        $dateFormatted = $day
            ? $day->format('d/m/Y')
            : ($invoice->invoice_date
                ? Carbon::parse($invoice->invoice_date)->format('d/m/Y')
                : ($invoice->created_at ? $invoice->created_at->format('d/m/Y') : ''));

        if ($isCancelled) {
            return [
                'item' => $itemIndex,
                'date' => $dateFormatted,
                'customer_name' => 'Anulada',
                'quantity' => 0,
                'payment_type_code' => 0,
                'payment_type_label' => '-',
                'gross_amount' => 0.0,
                'discount' => 0.0,
                'net_amount' => 0.0,
                'taxable_15' => 0.0,
                'exempt' => 0.0,
                'isv_15' => 0.0,
                'comment' => 'Factura Anulada',
                'invoice_number' => $invoiceNum,
                'is_cancelled' => true,
                'invoice_id' => $invoice->id,
                'invoice' => $invoice,
            ];
        }

        $pmKey = strtolower(trim((string) $invoice->payment_type));
        $pmCode = self::PAYMENT_CODES[$pmKey] ?? 1;
        $pmLabel = self::PAYMENT_LABELS[$pmCode] ?? 'Efectivo';

        $discount = (float) $invoice->discount;
        $net = (float) ($invoice->total > 0
            ? $invoice->total
            : ($invoice->total_paid > 0 ? $invoice->total_paid : $invoice->subtotal));

        $quantity = (int) ($invoice->quantity ?: 1);

        // Taxes
        $isv = (float) ($invoice->isv_15 > 0
            ? $invoice->isv_15
            : ($invoice->pay_isv ? round($invoice->taxable_amount_15 * 0.15, 2) : 0.0));

        // Pre-tax net base and pre-tax gross base
        $preTaxNet = max(0.0, $net - $isv);
        $preTaxGross = $preTaxNet + $discount;

        if ($invoice->pay_isv) {
            $taxable15 = $preTaxGross;
            $exempt = 0.0;
        } else {
            $taxable15 = 0.0;
            $exempt = $preTaxGross;
        }

        // Valor Factura in the daily table is net + discount
        $gross = $net + $discount;

        return [
            'item' => $itemIndex,
            'date' => $dateFormatted,
            'customer_name' => $invoice->customer?->name ?: 'Consumidor Final',
            'quantity' => $quantity,
            'payment_type_code' => $pmCode,
            'payment_type_label' => $pmLabel,
            'gross_amount' => $gross,
            'discount' => $discount,
            'net_amount' => $net,
            'taxable_15' => $taxable15,
            'exempt' => $exempt,
            'isv_15' => $isv,
            'comment' => $invoice->description ?: '',
            'invoice_number' => $invoiceNum,
            'is_cancelled' => false,
            'invoice_id' => $invoice->id,
            'invoice' => $invoice,
        ];
    }

    /**
     * Calculate settlement and fiscal metrics for a specific day.
     *
     * @param  Collection|array<Invoice>  $dayInvoices
     */
    public function calculateDailySettlement(Carbon $day, Collection|array $dayInvoices): array
    {
        $dayRows = [];
        $itemIndex = 1;

        $dayTotals = [
            'gross' => 0.0,
            'discount' => 0.0,
            'net' => 0.0,
        ];

        $settlement = [
            'cash' => 0.0,
            'check' => 0.0,
            'card' => 0.0,
            'transfer' => 0.0,
            'credit' => 0.0,
            'total' => 0.0,
            'difference' => 0.0,
            'is_balanced' => true,
        ];

        $dayTaxable15 = 0.0;
        $dayExempt = 0.0;
        $dayDiscount = 0.0;
        $dayIsv15 = 0.0;
        $dayTotalSales = 0.0;

        $firstInvoiceNum = null;
        $lastInvoiceNum = null;
        $activeCount = 0;
        $cancelledCount = 0;

        foreach ($dayInvoices as $inv) {
            $row = $this->calculateInvoiceRow($inv, $itemIndex++, $day);
            $dayRows[] = $row;

            if (! $firstInvoiceNum) {
                $firstInvoiceNum = $row['invoice_number'];
            }
            $lastInvoiceNum = $row['invoice_number'];

            if ($row['is_cancelled']) {
                $cancelledCount++;
            } else {
                $activeCount++;
                $dayTotals['gross'] += $row['gross_amount'];
                $dayTotals['discount'] += $row['discount'];
                $dayTotals['net'] += $row['net_amount'];

                switch ($row['payment_type_code']) {
                    case 1:
                        $settlement['cash'] += $row['net_amount'];
                        break;
                    case 2:
                        $settlement['check'] += $row['net_amount'];
                        break;
                    case 3:
                        $settlement['card'] += $row['net_amount'];
                        break;
                    case 4:
                        $settlement['transfer'] += $row['net_amount'];
                        break;
                    case 5:
                        $settlement['credit'] += $row['net_amount'];
                        break;
                }

                $dayTaxable15 += $row['taxable_15'];
                $dayExempt += $row['exempt'];
                $dayDiscount += $row['discount'];
                $dayIsv15 += $row['isv_15'];
                // Total sales strictly equals net amount (Taxable + Exempt - Discount + ISV)
                $dayTotalSales += ($row['taxable_15'] + $row['exempt'] - $row['discount'] + $row['isv_15']);
            }
        }

        $settlement['total'] = $settlement['cash'] + $settlement['check'] + $settlement['card'] + $settlement['transfer'] + $settlement['credit'];
        $settlement['difference'] = round($dayTotals['net'] - $settlement['total'], 2);
        $settlement['is_balanced'] = (abs($settlement['difference']) < 0.01);

        $spanishTitle = $this->formatDayTitleSpanish($day);

        return [
            'date' => $day->toDateString(),
            'day_name' => strtoupper($this->getSpanishDayName($day->dayOfWeek)),
            'formatted_date' => $day->format('d/m/Y'),
            'title' => $spanishTitle,
            'items' => $dayRows,
            'totals' => $dayTotals,
            'settlement' => $settlement,
            'invoice_count' => count($dayRows),
            'active_count' => $activeCount,
            'cancelled_count' => $cancelledCount,
            'taxable_15' => $dayTaxable15,
            'exempt' => $dayExempt,
            'discount' => $dayDiscount,
            'isv_15' => $dayIsv15,
            'total_sales' => $dayTotalSales,
            'first_invoice' => $firstInvoiceNum ?: '-',
            'last_invoice' => $lastInvoiceNum ?: '-',
        ];
    }

    /**
     * Build the query for invoices included in the billing reconciliation report.
     */
    public function buildQuery(Carbon $startDate, Carbon $endDate, ?string $customerId = null, ?string $search = null)
    {
        $query = Invoice::with(['customer', 'specimen.type', 'createdBy', 'creditRelation'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween(DB::raw('COALESCE(invoices.invoice_date, invoices.created_at)'), [
                    $startDate->toDateTimeString(),
                    $endDate->toDateTimeString(),
                ]);
            });

        // Invoices must have an invoice number assigned
        $query->whereNotNull('invoices.invoice_number')
            ->where('invoices.invoice_number', '!=', '');

        // Only include invoices that are already paid:
        // - Cancelled invoices are retained for sequential audit trail
        // - Invoices with a credit assigned must have their credit in 'paid' status
        // - Invoices without a credit assigned must not have payment_type = 'credit'
        $query->where(function ($q) {
            $q->where('invoices.invoice_type', 'cancelled')
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('invoices.credit_payment_id')
                        ->whereHas('creditRelation', function ($cq) {
                            $cq->where('status', 'paid');
                        });
                })
                ->orWhere(function ($sub) {
                    $sub->whereNull('invoices.credit_payment_id')
                        ->where('invoices.payment_type', '!=', 'credit');
                });
        });

        if ($customerId && $customerId !== 'all') {
            $query->where('customer_id', $customerId);
        }

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                    ->orWhere('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    });
            });
        }

        return $query->orderBy(DB::raw('COALESCE(invoices.invoice_date, invoices.created_at)'), 'asc')
            ->orderBy('id', 'asc');
    }

    /**
     * Calculate all daily settlement tables, general invoices, period summaries, and totals.
     */
    public function calculatePeriodReport(string $dateFrom, string $dateTo, ?string $customerId = null, ?string $search = null): array
    {
        $startDate = Carbon::parse($dateFrom)->startOfDay();
        $endDate = Carbon::parse($dateTo)->endOfDay();

        $invoices = $this->buildQuery($startDate, $endDate, $customerId, $search)->get();

        // Group invoices by date string Y-m-d
        $invoicesByDate = [];
        foreach ($invoices as $invoice) {
            $date = $invoice->invoice_date
                ? Carbon::parse($invoice->invoice_date)->toDateString()
                : ($invoice->created_at ? $invoice->created_at->toDateString() : null);

            if ($date) {
                $invoicesByDate[$date][] = $invoice;
            }
        }

        $dailyTables = [];
        $resumenRows = [];

        $period = CarbonPeriod::create($startDate->toDateString(), $endDate->toDateString());

        $periodTotals = [
            'gross' => 0.0,
            'discount' => 0.0,
            'net' => 0.0,
            'cash' => 0.0,
            'check' => 0.0,
            'card' => 0.0,
            'transfer' => 0.0,
            'credit' => 0.0,
            'taxable_15' => 0.0,
            'exempt' => 0.0,
            'isv_15' => 0.0,
            'total_sales' => 0.0,
            'invoice_count' => 0,
            'active_count' => 0,
            'cancelled_count' => 0,
        ];

        foreach ($period as $day) {
            // STRICTLY IGNORE SUNDAYS
            if ($day->isSunday()) {
                continue;
            }

            $dateKey = $day->toDateString();
            $dayInvoices = $invoicesByDate[$dateKey] ?? [];

            $settlementData = $this->calculateDailySettlement($day, $dayInvoices);

            $dailyTables[] = [
                'date' => $settlementData['date'],
                'day_name' => $settlementData['day_name'],
                'formatted_date' => $settlementData['formatted_date'],
                'title' => $settlementData['title'],
                'items' => $settlementData['items'],
                'totals' => $settlementData['totals'],
                'settlement' => $settlementData['settlement'],
                'invoice_count' => $settlementData['invoice_count'],
            ];

            // Resumen row for this day
            $resumenRows[] = [
                'date' => $settlementData['date'],
                'formatted_date' => $settlementData['formatted_date'],
                'start_invoice' => $settlementData['first_invoice'],
                'end_invoice' => $settlementData['last_invoice'],
                'customer' => 'Consumidor Final',
                'taxable_15' => $settlementData['taxable_15'],
                'exempt' => $settlementData['exempt'],
                'discount' => $settlementData['discount'],
                'isv_15' => $settlementData['isv_15'],
                'total' => $settlementData['total_sales'],
                'has_invoices' => count($dayInvoices) > 0,
            ];

            // Accumulate period totals
            $periodTotals['gross'] += $settlementData['totals']['gross'];
            $periodTotals['discount'] += $settlementData['totals']['discount'];
            $periodTotals['net'] += $settlementData['totals']['net'];
            $periodTotals['cash'] += $settlementData['settlement']['cash'];
            $periodTotals['check'] += $settlementData['settlement']['check'];
            $periodTotals['card'] += $settlementData['settlement']['card'];
            $periodTotals['transfer'] += $settlementData['settlement']['transfer'];
            $periodTotals['credit'] += $settlementData['settlement']['credit'];
            $periodTotals['taxable_15'] += $settlementData['taxable_15'];
            $periodTotals['exempt'] += $settlementData['exempt'];
            $periodTotals['isv_15'] += $settlementData['isv_15'];
            $periodTotals['total_sales'] += $settlementData['total_sales'];
            $periodTotals['invoice_count'] += $settlementData['invoice_count'];
            $periodTotals['active_count'] += $settlementData['active_count'];
            $periodTotals['cancelled_count'] += $settlementData['cancelled_count'];
        }

        $generalInvoices = [];
        foreach ($dailyTables as $dayTable) {
            foreach ($dayTable['items'] as $item) {
                $generalInvoices[] = $item;
            }
        }

        $resumenTotals = [
            'taxable_15' => 0.0,
            'exempt' => 0.0,
            'discount' => 0.0,
            'isv_15' => 0.0,
            'total' => 0.0,
        ];
        foreach ($resumenRows as $rRow) {
            $resumenTotals['taxable_15'] += $rRow['taxable_15'];
            $resumenTotals['exempt'] += $rRow['exempt'];
            $resumenTotals['discount'] += $rRow['discount'];
            $resumenTotals['isv_15'] += $rRow['isv_15'];
            $resumenTotals['total'] += $rRow['total'];
        }

        return [
            'dailyTables' => $dailyTables,
            'generalInvoices' => $generalInvoices,
            'resumenRows' => $resumenRows,
            'resumenTotals' => $resumenTotals,
            'periodTotals' => $periodTotals,
            'dateRange' => [
                'from' => $dateFrom,
                'to' => $dateTo,
                'from_formatted' => Carbon::parse($dateFrom)->format('d/m/Y'),
                'to_formatted' => Carbon::parse($dateTo)->format('d/m/Y'),
            ],
        ];
    }

    /**
     * Format full Spanish banner title for a day.
     */
    public function formatDayTitleSpanish(Carbon $date): string
    {
        $dayName = strtoupper($this->getSpanishDayName($date->dayOfWeek));
        $dayNum = str_pad((string) $date->day, 2, '0', STR_PAD_LEFT);
        $monthName = strtoupper($this->getSpanishMonthName($date->month));
        $year = $date->year;

        return "LIQUIDACIÓN DEL DIA {$dayName} {$dayNum} {$monthName} {$year}";
    }

    public function getSpanishDayName(int $dayOfWeek): string
    {
        return match ($dayOfWeek) {
            Carbon::MONDAY => 'Lunes',
            Carbon::TUESDAY => 'Martes',
            Carbon::WEDNESDAY => 'Miércoles',
            Carbon::THURSDAY => 'Jueves',
            Carbon::FRIDAY => 'Viernes',
            Carbon::SATURDAY => 'Sábado',
            Carbon::SUNDAY => 'Domingo',
            default => '',
        };
    }

    public function getSpanishMonthName(int $month): string
    {
        return match ($month) {
            1 => 'Enero',
            2 => 'Febrero',
            3 => 'Marzo',
            4 => 'Abril',
            5 => 'Mayo',
            6 => 'Junio',
            7 => 'Julio',
            8 => 'Agosto',
            9 => 'Septiembre',
            10 => 'Octubre',
            11 => 'Noviembre',
            12 => 'Diciembre',
            default => '',
        };
    }
}
