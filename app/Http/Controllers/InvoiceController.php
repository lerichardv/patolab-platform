<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Product;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Sequence;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\WorkOrderTask;
use App\Models\WorkOrderType;
use App\Services\DateFilterService;
use App\Services\InvoiceCalculationService;
use App\Services\InvoicePdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('invoices.view');
        $query = Invoice::with([
            'customer',
            'caiRange',
            'specimen.type',
            'specimen.examination.prices',
            'specimen.examinations',
            'specimen.specimenExaminations.examination',
            'specimen.customerRelation',
            'specimen.category',
            'specimen.referrerRelation',
            'specimen.priority',
            'invoiceSpecimens.specimen.customerRelation',
            'invoiceSpecimens.specimen.type',
            'invoiceSpecimens.examination.prices',
            'invoiceSpecimens.specimen.examination.prices',
            'invoiceSpecimens.specimen.products',
            'invoiceSpecimens.specimen.examinations',
            'invoiceSpecimens.specimen.specimenExaminations.examination',
            'invoiceSpecimens.specimen.category',
            'invoiceSpecimens.specimen.referrerRelation',
            'invoiceSpecimens.specimen.priority',
            'invoiceSpecimens.specimen.cancelledBy',
            'creditRelation.customer',
            'creditRelation.creditInvoiceSpecimens.examination',
            'creditRelation.creditInvoiceSpecimens.specimen.customerRelation',
            'creditRelation.creditInvoiceSpecimens.specimen.type',
            'creditRelation.creditInvoiceSpecimens.specimen.examination',
            'creditRelation.creditInvoiceSpecimens.specimen.examinations',
            'creditRelation.creditInvoiceSpecimens.specimen.specimenExaminations.examination',
            'creditRelation.specimen.customerRelation',
            'creditRelation.specimen.type',
            'creditRelation.specimen.examination',
            'creditRelation.specimen.examinations',
            'creditRelation.specimen.specimenExaminations.examination',
            'creditRelation.group.specimens.customerRelation',
            'creditRelation.group.specimens.type',
            'creditRelation.group.specimens.examination',
            'creditRelation.group.specimens.examinations',
            'creditRelation.group.specimens.specimenExaminations.examination',
            'rental',
            'group.specimens.type',
            'group.specimens.customerRelation',
            'group.specimens.examination.prices',
            'group.specimens.examinations',
            'group.specimens.specimenExaminations.examination',
            'group.specimens.category',
            'group.specimens.referrerRelation',
            'group.specimens.priority',
            'group.specimens.cancelledBy',
            'group.specimens.invoiceGroupSpecimen',
            'group.specimens.products',
            'groupSpecimens.specimen.type',
            'groupSpecimens.examination.prices',
            'groupSpecimens.specimen.examination.prices',
            'groupSpecimens.specimen.examinations',
            'groupSpecimens.specimen.specimenExaminations.examination',
            'groupSpecimens.specimen.customerRelation',
            'groupSpecimens.specimen.products',
            'groupSpecimens.specimen.cancelledBy',
            'creditInvoiceSpecimens.specimen.type',
            'creditInvoiceSpecimens.specimen.examination.prices',
            'creditInvoiceSpecimens.specimen.examinations',
            'creditInvoiceSpecimens.specimen.specimenExaminations.examination',
            'creditInvoiceSpecimens.specimen.customerRelation',
        ]);

        // Filter by search query (Invoice number, Customer name, Customer RTN/ID, or Specimen sequence code)
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('group.specimens', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('groupSpecimens.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditInvoiceSpecimens.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditRelation.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditRelation.group.specimens', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditRelation.creditInvoiceSpecimens.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    });
            });
        }

        // Resolve user cookies and query parameters
        $userId = auth()->id();

        // 4. Date Range Filter
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_invoices_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_invoices_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        // Filter by payment type
        if ($request->filled('payment_type') && $request->get('payment_type') !== 'all') {
            $query->where('payment_type', $request->get('payment_type'));
        }

        // Filter by customer
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer_id', $request->get('customer_id'));
        }

        // Filter by credit status
        if ($request->filled('has_credit') && $request->get('has_credit') !== 'all') {
            if ($request->get('has_credit') === 'yes') {
                $query->whereNotNull('credit_payment_id');
            } elseif ($request->get('has_credit') === 'no') {
                $query->whereNull('credit_payment_id');
            }
        }

        // Filter by invoice type
        if ($request->filled('invoice_type') && $request->get('invoice_type') !== 'all') {
            $query->where('invoice_type', $request->get('invoice_type'));
        }

        if (! empty($dateFrom) || ! empty($dateTo)) {
            $query->where(function ($q) use ($dateFrom, $dateTo) {
                // Scenario A: Non-grouped invoices within date range
                $q->where(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->where('invoices.is_group', false);
                    if (! empty($dateFrom)) {
                        $sub->whereDate('invoices.created_at', '>=', $dateFrom);
                    }
                    if (! empty($dateTo)) {
                        $sub->whereDate('invoices.created_at', '<=', $dateTo);
                    }
                });

                // Scenario B: Grouped credit invoices with specimens added within date range
                $q->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->where('invoices.is_group', true)
                        ->where('payment_type', 'credit')
                        ->where(function ($creditSub) use ($dateFrom, $dateTo) {
                            $creditSub->whereHas('creditInvoiceSpecimens.specimen', function ($subQ) use ($dateFrom, $dateTo) {
                                if (! empty($dateFrom)) {
                                    $subQ->whereDate('created_at', '>=', $dateFrom);
                                }
                                if (! empty($dateTo)) {
                                    $subQ->whereDate('created_at', '<=', $dateTo);
                                }
                            })->orWhereHas('groupSpecimens.specimen', function ($subQ) use ($dateFrom, $dateTo) {
                                if (! empty($dateFrom)) {
                                    $subQ->whereDate('created_at', '>=', $dateFrom);
                                }
                                if (! empty($dateTo)) {
                                    $subQ->whereDate('created_at', '<=', $dateTo);
                                }
                            });
                        });
                });

                // Scenario C: Grouped non-credit invoices with specimens added within date range
                $q->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->where('invoices.is_group', true)
                        ->where('payment_type', '!=', 'credit')
                        ->whereHas('groupSpecimens.specimen', function ($subQ) use ($dateFrom, $dateTo) {
                            if (! empty($dateFrom)) {
                                $subQ->whereDate('created_at', '>=', $dateFrom);
                            }
                            if (! empty($dateTo)) {
                                $subQ->whereDate('created_at', '<=', $dateTo);
                            }
                        });
                });

                // Scenario D: Credit payment and social security invoices within date range
                $q->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->whereIn('invoice_type', ['credit payment', 'social security']);
                    if (! empty($dateFrom)) {
                        $sub->whereDate('invoices.created_at', '>=', $dateFrom);
                    }
                    if (! empty($dateTo)) {
                        $sub->whereDate('invoices.created_at', '<=', $dateTo);
                    }
                });
            });
        }

        // Filter by specimen group
        if ($request->filled('group_id') && $request->get('group_id') !== 'all') {
            $query->where('group_id', $request->get('group_id'));
        }

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $query->select('invoices.*');

        switch ($sortField) {
            case 'invoice_number':
                $query->orderBy('invoices.invoice_number', $sortDirection);
                break;
            case 'invoice_date':
                $query->orderByRaw('COALESCE(invoices.invoice_date, invoices.created_at) '.$sortDirection);
                break;
            case 'customer':
                $query->join('customers', 'invoices.customer_id', '=', 'customers.id')
                    ->orderBy('customers.name', $sortDirection);
                break;
            case 'payment_method':
                $query->orderBy('payment_type', $sortDirection);
                break;
            case 'credit':
                $query->orderByRaw('CASE WHEN credit_payment_id IS NULL THEN 0 ELSE 1 END '.$sortDirection);
                break;
            case 'specimen_code':
                $query->leftJoin('specimen', 'invoices.specimen_id', '=', 'specimen.id')
                    ->orderBy('specimen.sequence_code', $sortDirection);
                break;
            case 'total':
                $query->orderBy('invoices.total', $sortDirection);
                break;
            case 'total_paid':
                $query->orderBy('invoices.total_paid', $sortDirection);
                break;
            case 'date':
            default:
                $query->orderBy('invoices.created_at', $sortDirection);
                break;
        }

        $invoices = $query->paginate(10)->withQueryString();

        // Resolve the currently-filtered customer for the async combobox initial label
        $selectedCustomer = null;
        $filteredCustomerId = $request->get('customer_id');
        if ($filteredCustomerId && $filteredCustomerId !== 'all') {
            $selectedCustomer = Customer::where('id', $filteredCustomerId)
                ->select('id', 'name', 'id_number')
                ->first();
        }

        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();
        $banks = Bank::all();

        $examinations = SpecimenTypeExamination::where('active', true)->with('prices')->get();
        $categories = SpecimenCategory::where('active', true)->get();
        $referrers = Referrer::where('active', true)->get();
        $referrerTypes = ReferrerType::where('active', true)->get();
        $priorities = Priority::orderBy('order', 'desc')->get();
        $locations = Location::where('active', true)->get();

        $activeCai = CaiRange::where('status', 'active')->first();
        $activeLocationId = $activeCai ? $activeCai->location_id : null;
        $sequences = Sequence::where('active', true)->get()->map(function ($sequence) {
            $tempSequence = clone $sequence;
            $currentMonth = now()->format('m');
            $currentYear = now()->format('Y');
            do {
                $paddedSeq = str_pad($tempSequence->current_sequence, $tempSequence->fill ?? 4, '0', STR_PAD_LEFT);
                $paddedMonth = str_pad($currentMonth, 2, '0', STR_PAD_LEFT);
                $sequenceCode = $tempSequence->prefix.$tempSequence->separator.$paddedSeq.$tempSequence->separator.$paddedMonth.$tempSequence->separator.$currentYear;

                $exists = Specimen::where('sequence_code', $sequenceCode)->exists();
                if ($exists) {
                    $tempSequence->current_sequence++;
                }
            } while ($exists);
            $sequence->current_sequence = $tempSequence->current_sequence;

            return $sequence;
        });

        $products = Product::where('active', true)
            ->whereHas('inventory', function ($q) {
                $q->where('active', true);
            })
            ->withSum(['inventory as total_stock' => function ($q) {
                $q->where('active', true);
            }], 'quantity')
            ->with('prices')
            ->get();

        return Inertia::render('invoices/index', [
            'invoices' => $invoices,
            'filters' => array_merge(
                $request->only([
                    'search', 'payment_type', 'customer_id',
                    'has_credit', 'sort_field', 'sort_direction', 'group_id', 'invoice_type',
                ]),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
            'selectedCustomer' => $selectedCustomer,
            'specimenTypes' => $specimenTypes,
            'banks' => $banks,
            'examinations' => $examinations,
            'categories' => $categories,
            'referrers' => $referrers,
            'referrerTypes' => $referrerTypes,
            'priorities' => $priorities,
            'locations' => $locations,
            'sequences' => $sequences,
            'activeLocationId' => $activeLocationId,
            'products' => $products,
            'groups' => SpecimenGroup::orderBy('name', 'asc')->get(),
            'settings' => Setting::all()->pluck('setting_value', 'setting_key'),
            'workOrderTypes' => WorkOrderType::orderBy('name')->get(),
            'workOrderTasks' => WorkOrderTask::orderBy('name')->get(),
            'usersList' => User::where('active', true)->orderBy('name')->get(),
        ]);
    }

    public function export(Request $request)
    {
        Gate::authorize('invoices.view');
        $query = Invoice::with([
            'customer',
            'specimen.type',
            'specimen.examination.prices',
            'specimen.examinations',
            'specimen.specimenExaminations.examination',
            'specimen.customerRelation',
            'invoiceSpecimens.specimen.customerRelation',
            'invoiceSpecimens.specimen.type',
            'invoiceSpecimens.examination.prices',
            'invoiceSpecimens.specimen.examination.prices',
            'invoiceSpecimens.specimen.products',
            'invoiceSpecimens.specimen.examinations',
            'invoiceSpecimens.specimen.specimenExaminations.examination',
            'creditRelation.customer',
            'creditRelation.creditInvoiceSpecimens.examination',
            'creditRelation.creditInvoiceSpecimens.specimen.customerRelation',
            'creditRelation.creditInvoiceSpecimens.specimen.type',
            'creditRelation.creditInvoiceSpecimens.specimen.examination',
            'creditRelation.creditInvoiceSpecimens.specimen.examinations',
            'creditRelation.creditInvoiceSpecimens.specimen.specimenExaminations.examination',
            'creditRelation.specimen.customerRelation',
            'creditRelation.specimen.type',
            'creditRelation.specimen.examination',
            'creditRelation.specimen.examinations',
            'creditRelation.specimen.specimenExaminations.examination',
        ]);

        // Filter by search query (Invoice number, Customer name, Customer RTN/ID, or Specimen sequence code)
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('group.specimens', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('groupSpecimens.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditInvoiceSpecimens.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditRelation.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditRelation.group.specimens', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('creditRelation.creditInvoiceSpecimens.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by payment type
        if ($request->filled('payment_type') && $request->get('payment_type') !== 'all') {
            $query->where('payment_type', $request->get('payment_type'));
        }

        // Filter by customer
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer_id', $request->get('customer_id'));
        }

        // Filter by credit status
        if ($request->filled('has_credit') && $request->get('has_credit') !== 'all') {
            if ($request->get('has_credit') === 'yes') {
                $query->whereNotNull('credit_payment_id');
            } elseif ($request->get('has_credit') === 'no') {
                $query->whereNull('credit_payment_id');
            }
        }

        // Filter by invoice type
        if ($request->filled('invoice_type') && $request->get('invoice_type') !== 'all') {
            $query->where('invoice_type', $request->get('invoice_type'));
        }

        // Resolve date range from request, cookie, or default for export
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_invoices_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFromExport = $resolvedDates['from'];
        $dateToExport = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_invoices_user_{$userId}",
                $dateFromExport,
                $dateToExport,
                $resolvedDates['range']
            ));
        }

        if (! empty($dateFromExport) || ! empty($dateToExport)) {
            $query->where(function ($q) use ($dateFromExport, $dateToExport) {
                // Scenario A: Non-grouped invoices within date range
                $q->where(function ($sub) use ($dateFromExport, $dateToExport) {
                    $sub->where('invoices.is_group', false);
                    if (! empty($dateFromExport)) {
                        $sub->whereDate('invoices.created_at', '>=', $dateFromExport);
                    }
                    if (! empty($dateToExport)) {
                        $sub->whereDate('invoices.created_at', '<=', $dateToExport);
                    }
                });

                // Scenario B: Grouped credit invoices with specimens added within date range
                $q->orWhere(function ($sub) use ($dateFromExport, $dateToExport) {
                    $sub->where('invoices.is_group', true)
                        ->where('payment_type', 'credit')
                        ->whereHas('creditInvoiceSpecimens.specimen', function ($subQ) use ($dateFromExport, $dateToExport) {
                            if (! empty($dateFromExport)) {
                                $subQ->whereDate('created_at', '>=', $dateFromExport);
                            }
                            if (! empty($dateToExport)) {
                                $subQ->whereDate('created_at', '<=', $dateToExport);
                            }
                        });
                });

                // Scenario C: Grouped non-credit invoices with specimens added within date range
                $q->orWhere(function ($sub) use ($dateFromExport, $dateToExport) {
                    $sub->where('invoices.is_group', true)
                        ->where('payment_type', '!=', 'credit')
                        ->whereHas('groupSpecimens.specimen', function ($subQ) use ($dateFromExport, $dateToExport) {
                            if (! empty($dateFromExport)) {
                                $subQ->whereDate('created_at', '>=', $dateFromExport);
                            }
                            if (! empty($dateToExport)) {
                                $subQ->whereDate('created_at', '<=', $dateToExport);
                            }
                        });
                });

                // Scenario D: Credit payment and social security invoices within date range
                $q->orWhere(function ($sub) use ($dateFromExport, $dateToExport) {
                    $sub->whereIn('invoice_type', ['credit payment', 'social security']);
                    if (! empty($dateFromExport)) {
                        $sub->whereDate('invoices.created_at', '>=', $dateFromExport);
                    }
                    if (! empty($dateToExport)) {
                        $sub->whereDate('invoices.created_at', '<=', $dateToExport);
                    }
                });
            });
        }

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $query->select('invoices.*');

        switch ($sortField) {
            case 'customer':
                $query->join('customers', 'invoices.customer_id', '=', 'customers.id')
                    ->orderBy('customers.name', $sortDirection);
                break;
            case 'payment_method':
                $query->orderBy('payment_type', $sortDirection);
                break;
            case 'credit':
                $query->orderByRaw('CASE WHEN credit_payment_id IS NULL THEN 0 ELSE 1 END '.$sortDirection);
                break;
            case 'specimen_code':
                $query->leftJoin('specimen', 'invoices.specimen_id', '=', 'specimen.id')
                    ->orderBy('specimen.sequence_code', $sortDirection);
                break;
            case 'date':
            default:
                $query->orderBy('invoices.created_at', $sortDirection);
                break;
        }

        $invoices = $query->get();

        $format = $request->get('format', 'csv');

        $paymentLabels = [
            'cash' => 'Efectivo',
            'card' => 'Tarjeta',
            'credit card' => 'Tarjeta',
            'transfer' => 'Transferencia',
            'bank transfer' => 'Transferencia',
            'check' => 'Cheque',
            'credit' => 'Crédito',
        ];

        if ($format === 'xlsx') {
            $spreadsheet = new Spreadsheet;
            $sheet = $spreadsheet->getActiveSheet();

            $headers = [
                'Número Factura', 'Fecha', 'Cliente', 'RTN/Identidad',
                'Método de Pago', 'Código Muestra', 'Tipo de Muestra',
                'Examen/Análisis', 'Total Factura', 'Total Pagado', 'Saldo Pendiente',
            ];

            foreach ($headers as $colIndex => $headerText) {
                $sheet->setCellValue([$colIndex + 1, 1], $headerText);
            }

            $row = 2;
            foreach ($invoices as $invoice) {
                $credit = $invoice->creditRelation;
                $remaining = $credit ? (float) $credit->amount_remaining : 0.0;

                $data = [
                    $invoice->full_invoice_number,
                    $invoice->created_at->format('d/m/Y h:i A'),
                    $invoice->customer?->name ?? 'N/A',
                    $invoice->customer?->id_number ?? 'N/A',
                    $paymentLabels[$invoice->payment_type] ?? $invoice->payment_type,
                    $invoice->specimen?->sequence_code ?? 'N/A',
                    $invoice->specimen?->type?->name ?? 'N/A',
                    $invoice->specimen?->examination?->name ?? 'N/A',
                    (float) $invoice->total,
                    (float) $invoice->total_paid,
                    $remaining,
                ];

                foreach ($data as $colIndex => $val) {
                    $sheet->setCellValue([$colIndex + 1, $row], $val);
                }
                $row++;
            }

            foreach (range(1, count($headers)) as $colIndex) {
                $sheet->getColumnDimensionByColumn($colIndex)->setAutoSize(true);
            }

            $writer = new Xlsx($spreadsheet);

            return response()->streamDownload(function () use ($writer) {
                $writer->save('php://output');
            }, 'facturas_patolab.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'max-age=0',
            ]);
        }

        // CSV format
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="facturas_patolab.csv"',
        ];

        $callback = function () use ($invoices, $paymentLabels) {
            $file = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, [
                'Número Factura', 'Fecha', 'Cliente', 'RTN/Identidad',
                'Método de Pago', 'Código Muestra', 'Tipo de Muestra',
                'Examen/Análisis', 'Total Factura', 'Total Pagado', 'Saldo Pendiente',
            ]);

            foreach ($invoices as $invoice) {
                $credit = $invoice->creditRelation;
                $remaining = $credit ? (float) $credit->amount_remaining : 0.0;

                fputcsv($file, [
                    $invoice->full_invoice_number,
                    $invoice->created_at->format('d/m/Y h:i A'),
                    $invoice->customer?->name ?? 'N/A',
                    $invoice->customer?->id_number ?? 'N/A',
                    $paymentLabels[$invoice->payment_type] ?? $invoice->payment_type,
                    $invoice->specimen?->sequence_code ?? 'N/A',
                    $invoice->specimen?->type?->name ?? 'N/A',
                    $invoice->specimen?->examination?->name ?? 'N/A',
                    number_format((float) $invoice->total, 2, '.', ''),
                    number_format((float) $invoice->total_paid, 2, '.', ''),
                    number_format($remaining, 2, '.', ''),
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function update(Request $request, Invoice $invoice)
    {
        Gate::authorize('invoices.manage');
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'payment_type' => 'required|in:cash,credit card,bank transfer,check,credit',
            'quantity' => 'required|integer|min:1',
            'amount' => 'required|numeric|min:0',
            'discount' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'exempt_amount' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'total_paid' => 'required|numeric|min:0',
            'rental_id' => 'nullable|exists:rentals,id',
            'description' => 'nullable|string|max:1000',
            'custom_amount_enabled' => 'nullable|boolean',
            'custom_amount' => 'nullable|numeric|min:0',
            'custom_amount_reason' => 'nullable|string|max:255',
            'age_discount_type' => 'nullable|string|in:third,fourth',
            'age_discount_amount' => 'nullable|numeric|min:0',
            'payment_method_date' => 'nullable|date',
            'cash_value' => 'nullable|numeric|min:0',
            'check_number' => 'nullable|string|max:255',
            'check_value' => 'nullable|numeric|min:0',
            'card_last_4' => 'nullable|string|max:4',
            'card_value_charged' => 'nullable|numeric|min:0',
            'card_expiration' => 'nullable|string|max:10',
            'card_authorization_code' => 'nullable|string|max:255',
            'transfer_bank_id' => 'nullable|exists:banks,id',
            'transfer_value' => 'nullable|numeric|min:0',
            'transfer_authorization_code' => 'nullable|string|max:255',
            'proof_of_payment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp,gif|max:30720',
            'group_specimens' => 'nullable|array',
            'group_specimens.*.id' => 'required|integer|exists:invoice_specimens,id',
            'group_specimens.*.selected_price' => 'required|string',
            'group_specimens.*.custom_specimen_price' => 'nullable|numeric|min:0',
            'group_specimens.*.quantity' => 'required|integer|min:1',
            'group_specimens.*.age_discount_type' => 'nullable|string|in:third,fourth',
            'group_specimens.*.age_discount_amount' => 'nullable|numeric|min:0',
            'group_specimens.*.additional_discount_enabled' => 'nullable|boolean',
            'group_specimens.*.additional_discount' => 'nullable|numeric|min:0',
            'pay_isv' => 'nullable|boolean',
        ]);

        $isSpecimenOrGroup = (bool) ($invoice->specimen_id || $invoice->is_group || $invoice->group_id || $invoice->invoice_type === 'specimen');
        $hasInvoiceNumber = ! empty($invoice->invoice_number) || ! empty($invoice->full_invoice_number);
        $wasCredit = $invoice->payment_type === 'credit';
        $wasNotCredit = $invoice->payment_type !== 'credit';

        if ($isSpecimenOrGroup && $wasNotCredit && $hasInvoiceNumber && $validated['payment_type'] === 'credit') {
            throw ValidationException::withMessages([
                'payment_type' => 'Una factura con número de factura asignado no se puede cambiar a crédito.',
            ]);
        }

        if ($isSpecimenOrGroup && $wasCredit && $validated['payment_type'] !== 'credit') {
            throw ValidationException::withMessages([
                'payment_type' => 'Una factura registrada como crédito no se puede cambiar a otro método de pago. Debe procesarse mediante "Pago final" en el módulo de créditos o facturación.',
            ]);
        }

        if ($request->hasFile('proof_of_payment')) {
            if ($invoice->proof_of_payment && Storage::disk('public')->exists($invoice->proof_of_payment)) {
                Storage::disk('public')->delete($invoice->proof_of_payment);
            }
            $path = $request->file('proof_of_payment')->store('proofs', 'public');
            $validated['proof_of_payment'] = $path;
        } else {
            unset($validated['proof_of_payment']);
        }

        // Extract group_specimens to process separately
        $groupSpecimensData = $validated['group_specimens'] ?? null;
        unset($validated['group_specimens']);

        // Calculate tax/exempt fields based on invoice type
        if ($invoice->invoice_type === 'rental' || $invoice->rental_id) {
            $payIsv = filter_var($request->input('pay_isv', $invoice->pay_isv ?? false), FILTER_VALIDATE_BOOLEAN);
            $calc = InvoiceCalculationService::calculateRental($validated, $payIsv);

            $validated['amount'] = $calc['amount'];
            $validated['quantity'] = $calc['quantity'];
            $validated['discount'] = $calc['discount'];
            $validated['subtotal'] = $calc['subtotal'];
            $validated['pay_isv'] = $calc['pay_isv'];
            $validated['tax_exempt_amount'] = $calc['tax_exempt_amount'];
            $validated['taxable_amount_15'] = $calc['taxable_amount_15'];
            $validated['taxable_amount_18'] = 0.00;
            $validated['exempt_amount'] = $calc['exempt_amount'];
            $validated['isv_15'] = $calc['isv_15'];
            $validated['isv_18'] = 0.00;
            $validated['total'] = $calc['total'];
        } else {
            $validated['tax_exempt_amount'] = (float) $validated['subtotal'];
            $validated['taxable_amount_15'] = 0.00;
            $validated['taxable_amount_18'] = 0.00;
            $validated['isv_15'] = 0.00;
            $validated['isv_18'] = 0.00;
        }

        $invoice->update($validated);

        // Sync customer to related models
        if (! $invoice->is_group && $invoice->specimen) {
            $invoice->specimen->update(['customer' => $validated['customer_id']]);
        } elseif ($invoice->is_group && $invoice->group) {
            $invoice->group->update(['customer_id' => $validated['customer_id']]);
            $invoice->group->customers()->sync([$validated['customer_id']]);
        }

        if ($groupSpecimensData) {
            $settingsMap = Setting::all()->pluck('setting_value', 'setting_key')->toArray();
            foreach ($groupSpecimensData as $item) {
                $igs = InvoiceSpecimen::with(['examination.prices', 'specimen.examination.prices'])->findOrFail($item['id']);
                $examination = $igs->examination ?? $igs->specimen?->examination;

                $calc = InvoiceCalculationService::calculateItem($item, $examination, $settingsMap);

                $igs->update([
                    'quantity' => $calc['quantity'],
                    'amount' => $calc['amount'],
                    'discount' => $calc['discount'],
                    'subtotal' => $calc['subtotal'],
                    'exempt_amount' => $calc['exempt_amount'],
                    'taxable_amount_15' => 0.00,
                    'taxable_amount_18' => 0.00,
                    'isv_15' => 0.00,
                    'isv_18' => 0.00,
                    'total' => $calc['total'],
                    'selected_price' => $calc['selected_price'],
                    'custom_specimen_price' => $calc['custom_specimen_price'],
                    'additional_discount_enabled' => $calc['additional_discount_enabled'],
                    'additional_discount' => $calc['additional_discount'],
                    'age_discount_type' => $calc['age_discount_type'],
                    'age_discount_amount' => $calc['age_discount_amount'],
                ]);
            }
        }

        // Update parent Credit record if present
        if ($invoice->credit_payment_id) {
            $credit = Credit::find($invoice->credit_payment_id);
            if ($credit) {
                // If it's a single specimen credit, synchronize invoice_specimens
                if (! $credit->is_group && $invoice->specimen_id) {
                    $cis = InvoiceSpecimen::where('credit_id', $credit->id)
                        ->where('invoice_id', $invoice->id)
                        ->where('specimen_id', $invoice->specimen_id)
                        ->first();
                    if ($cis) {
                        $cis->update([
                            'amount' => (float) $validated['amount'] - (float) ($validated['custom_amount'] ?? 0),
                            'discount' => (float) $validated['discount'],
                            'subtotal' => (float) $validated['subtotal'],
                            'exempt_amount' => (float) $validated['total'],
                            'taxable_amount_15' => 0.00,
                            'taxable_amount_18' => 0.00,
                            'isv_15' => 0.00,
                            'isv_18' => 0.00,
                            'total' => (float) $validated['total'],
                        ]);
                    }
                }

                $newTotal = (float) $validated['total'];
                $amountPaid = (float) $credit->amount_paid;
                $credit->update([
                    'credit_amount' => $newTotal,
                    'amount_remaining' => max(0.0, $newTotal - $amountPaid),
                ]);
            }
        }

        if ($request->boolean('regenerate_pdf', true)) {
            try {
                app(InvoicePdfService::class)->generateAndStoreInvoice($invoice);
            } catch (\Exception $e) {
                \Log::warning('Error regenerating invoice PDF: '.$e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Factura actualizada con éxito.');
    }

    protected function numberToSpanishWords(float $number): string
    {
        $amount = number_format($number, 2, '.', '');
        $parts = explode('.', $amount);
        $integerPart = (int) $parts[0];
        $decimalPart = $parts[1];

        if ($integerPart === 0) {
            $integerWords = 'CERO';
        } else {
            $integerWords = $this->numberToSpanishWordsHelper($integerPart);
        }

        return $integerWords.' CON '.$decimalPart.'/100';
    }

    protected function numberToSpanishWordsHelper(int $number): string
    {
        $units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        $tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        $teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        $twenties = ['VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
        $hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        if ($number < 10) {
            return $units[$number];
        }
        if ($number < 20) {
            return $teens[$number - 10];
        }
        if ($number < 30) {
            return $twenties[$number - 20];
        }
        if ($number < 100) {
            $ten = (int) ($number / 10);
            $unit = $number % 10;

            return $tens[$ten].($unit > 0 ? ' Y '.$units[$unit] : '');
        }
        if ($number < 1000) {
            if ($number === 100) {
                return 'CIEN';
            }
            $hundred = (int) ($number / 100);
            $remainder = $number % 100;

            return $hundreds[$hundred].($remainder > 0 ? ' '.$this->numberToSpanishWordsHelper($remainder) : '');
        }
        if ($number < 1000000) {
            $thousands = (int) ($number / 1000);
            $remainder = $number % 1000;
            $prefix = $thousands === 1 ? 'MIL' : $this->numberToSpanishWordsHelper($thousands).' MIL';

            return $prefix.($remainder > 0 ? ' '.$this->numberToSpanishWordsHelper($remainder) : '');
        }
        if ($number < 1000000000) {
            $millions = (int) ($number / 1000000);
            $remainder = $number % 1000000;
            $prefix = $millions === 1 ? 'UN MILLON' : $this->numberToSpanishWordsHelper($millions).' MILLONES';

            return $prefix.($remainder > 0 ? ' '.$this->numberToSpanishWordsHelper($remainder) : '');
        }

        return '';
    }

    public function auditHistory(Invoice $invoice)
    {
        Gate::authorize('invoices.view');

        $logs = DB::table('audit_log as al')
            ->join('invoice_specimens as ivs', function ($join) {
                $join->on('al.row_id', '=', 'ivs.id')
                    ->whereIn('al.table', ['invoice_specimens', 'invoice_specimen']);
            })
            ->leftJoin('specimen as s', 'ivs.specimen_id', '=', 's.id')
            ->leftJoin('customers as c', 's.customer', '=', 'c.id')
            ->leftJoin('users as u', 'al.user', '=', 'u.id')
            ->select(
                'al.audit_session_code',
                'u.name as user_name',
                'c.name as patient_name',
                'al.action',
                'al.row_id as invoice_specimen_id',
                'ivs.invoice_id',
                'ivs.specimen_id',
                's.sequence_code as specimen_sequence_code',
                'al.created_at as date',
                'al.column',
                'al.old_value',
                'al.new_value'
            )
            ->whereIn('al.table', ['invoice_specimens', 'invoice_specimen'])
            ->where('ivs.invoice_id', $invoice->id)
            ->whereNotIn('al.column', [
                'id',
                'full_invoice_number',
                'invoice_number',
                'cai_range_id',
                'customer_id',
                'specimen_id',
                'rental_id',
                'payment_type',
                'payment_method_date',
                'invoice_id',
                'examination_id',
                'is_group',
                'group_id',
                'credit_id',
                'is_paid',
                'created_at',
                'updated_at',
                'deleted_at',
            ])
            ->orderBy('s.sequence_code')
            ->orderByDesc('date')
            ->orderBy('al.action')
            ->get();

        $invoiceSpecimens = InvoiceSpecimen::where('invoice_id', $invoice->id)->get()->keyBy('id');

        $history = $logs->groupBy(function ($item) {
            return $item->audit_session_code.'_'.$item->invoice_specimen_id;
        })->map(function ($group) use ($invoiceSpecimens, $invoice) {
            $first = $group->first();
            $specimenRecord = $invoiceSpecimens->get($first->invoice_specimen_id);

            $changes = $group->map(function ($log) use ($specimenRecord) {
                $currentVal = $specimenRecord ? $specimenRecord->getAttribute($log->column) : null;

                return [
                    'column' => $log->column,
                    'old' => $log->old_value,
                    'new' => $log->new_value,
                    'current' => $currentVal !== null ? (string) $currentVal : null,
                ];
            })->values()->toArray();

            return [
                'audit_session_code' => $first->audit_session_code,
                'user_name' => $first->user_name ?? 'Sistema',
                'patient_name' => $first->patient_name ?? $invoice->customer?->name ?? 'Sin paciente asignado',
                'action' => $first->action,
                'invoice_specimen_id' => $first->invoice_specimen_id,
                'invoice_id' => $first->invoice_id,
                'specimen_id' => $first->specimen_id,
                'specimen_sequence_code' => $first->specimen_sequence_code,
                'date' => $first->date,
                'changes_made' => $changes,
            ];
        })->values()->toArray();

        return response()->json($history);
    }

    public function restoreAuditChange(Request $request, Invoice $invoice)
    {
        Gate::authorize('invoices.manage');

        $validated = $request->validate([
            'invoice_specimen_id' => 'required|exists:invoice_specimens,id',
            'column' => 'required|string',
            'value' => 'nullable',
        ]);

        $invoiceSpecimen = InvoiceSpecimen::findOrFail($validated['invoice_specimen_id']);

        if ($invoiceSpecimen->invoice_id !== $invoice->id) {
            abort(403, 'Acción no autorizada para esta factura.');
        }

        AuditLog::$currentOrigin = 'changes history';

        DB::transaction(function () use ($invoiceSpecimen, $validated) {
            $invoiceSpecimen->update([
                $validated['column'] => $validated['value'],
            ]);
        });

        AuditLog::$currentOrigin = 'system';

        return response()->json(['message' => 'Cambio restaurado con éxito']);
    }
}
