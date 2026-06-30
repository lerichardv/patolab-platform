<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\CreditInvoiceSpecimen;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceGroupSpecimen;
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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Browsershot\Browsershot;

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
            'specimen.type.prices',
            'specimen.examination',
            'specimen.category',
            'specimen.referrerRelation',
            'specimen.priority',
            'creditRelation',
            'rental',
            'group.specimens.customerRelation',
            'group.specimens.type.prices',
            'group.specimens.examination',
            'group.specimens.category',
            'group.specimens.referrerRelation',
            'group.specimens.priority',
            'groupSpecimens.specimen.type.prices',
            'groupSpecimens.specimen.examination',
            'groupSpecimens.specimen.customerRelation',
            'groupSpecimens.specimen.products',
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
                    });
            });
        }

        // Resolve user cookies and query parameters
        $userId = auth()->id();

        // 4. Date Range Filter
        $dateCookie = $request->cookie("date_filter_invoices_user_{$userId}");
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        if (! $request->has('date_from') && ! $request->has('date_to')) {
            if ($dateCookie) {
                $decoded = json_decode($dateCookie, true);
                if (is_array($decoded)) {
                    $dateFrom = $decoded['from'] ?? '';
                    $dateTo = $decoded['to'] ?? '';
                }
            } else {
                $dateFrom = now()->subDays(14)->toDateString();
                $dateTo = now()->toDateString();
            }
        }
        $isValidDate = function ($date) {
            return ! empty($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date);
        };
        if ($dateFrom && ! $isValidDate($dateFrom)) {
            $dateFrom = now()->subDays(14)->toDateString();
        }
        if ($dateTo && ! $isValidDate($dateTo)) {
            $dateTo = now()->toDateString();
        }
        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(cookie("date_filter_invoices_user_{$userId}", json_encode(['from' => $dateFrom ?? '', 'to' => $dateTo ?? '']), 525600, null, null, null, false));
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

        if (! empty($dateFrom)) {
            $query->whereDate('invoices.created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $query->whereDate('invoices.created_at', '<=', $dateTo);
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

        $customers = Customer::where('active', true)->orderBy('name', 'asc')->get();
        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->with('prices')->get();
        $banks = Bank::all();

        $examinations = SpecimenTypeExamination::where('active', true)->get();
        $categories = SpecimenCategory::where('active', true)->get();
        $referrers = Referrer::where('active', true)->get();
        $referrerTypes = ReferrerType::where('active', true)->get();
        $priorities = Priority::orderBy('order', 'desc')->get();
        $locations = Location::where('active', true)->get();

        $activeCai = CaiRange::where('status', 'active')->first();
        $activeLocationId = $activeCai ? $activeCai->location_id : null;
        $sequences = Sequence::where('active', true)->get()->map(function ($sequence) {
            $tempSequence = clone $sequence;
            do {
                $paddedSeq = str_pad($tempSequence->current_sequence, $tempSequence->fill ?? 4, '0', STR_PAD_LEFT);
                $paddedMonth = str_pad($tempSequence->month, 2, '0', STR_PAD_LEFT);
                $sequenceCode = $tempSequence->prefix.$tempSequence->separator.$paddedSeq.$tempSequence->separator.$paddedMonth.$tempSequence->separator.$tempSequence->year;

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
            'customers' => $customers,
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
        ]);
    }

    public function export(Request $request)
    {
        Gate::authorize('invoices.view');
        $query = Invoice::with([
            'customer',
            'specimen.type.prices',
            'specimen.examination',
            'creditRelation',
        ]);

        // Filter by search query (Invoice number, Customer name or Customer ID/RTN)
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
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
        $dateFromExport = $request->get('date_from');
        $dateToExport = $request->get('date_to');

        if (! $request->has('date_from') && ! $request->has('date_to')) {
            $cookieName = "date_filter_invoices_user_{$userId}";
            $cookieVal = $request->cookie($cookieName);
            if ($cookieVal) {
                $decoded = json_decode($cookieVal, true);
                if (is_array($decoded)) {
                    $dateFromExport = $decoded['from'] ?? '';
                    $dateToExport = $decoded['to'] ?? '';
                }
            } else {
                $dateFromExport = now()->subDays(14)->toDateString();
                $dateToExport = now()->toDateString();
            }
        }

        if (! empty($dateFromExport)) {
            $query->whereDate('invoices.created_at', '>=', $dateFromExport);
        }
        if (! empty($dateToExport)) {
            $query->whereDate('invoices.created_at', '<=', $dateToExport);
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
            'group_specimens.*.id' => 'required|integer|exists:invoice_group_specimens,id',
            'group_specimens.*.selected_price' => 'required|string',
            'group_specimens.*.custom_specimen_price' => 'required|numeric|min:0',
            'group_specimens.*.quantity' => 'required|integer|min:1',
            'group_specimens.*.age_discount_type' => 'nullable|string|in:third,fourth',
            'group_specimens.*.age_discount_amount' => 'nullable|numeric|min:0',
            'group_specimens.*.additional_discount_enabled' => 'nullable|boolean',
            'group_specimens.*.additional_discount' => 'nullable|numeric|min:0',
        ]);

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

        $invoice->update($validated);

        if ($groupSpecimensData) {
            foreach ($groupSpecimensData as $item) {
                $igs = InvoiceGroupSpecimen::with('specimen.type.prices')->findOrFail($item['id']);

                $qty = (int) ($item['quantity'] ?? 1);
                $priceVal = $item['selected_price'] === 'custom'
                    ? (float) $item['custom_specimen_price']
                    : (float) $item['selected_price'];

                $prices = $igs->specimen->type->prices ?? collect();
                $priceAmounts = $prices->map(fn ($p) => (float) $p->amount)->toArray();
                $maxPrice = count($priceAmounts) > 0 ? max($priceAmounts) : 0.0;
                $maxPrice = max($maxPrice, $priceVal);

                $ageDiscountVal = (float) ($item['age_discount_amount'] ?? 0.0);
                $addDiscountVal = ! empty($item['additional_discount_enabled']) ? (float) ($item['additional_discount'] ?? 0.0) : 0.0;
                $diffDiscountVal = max(0.0, $maxPrice - $priceVal);

                $totalDiscountPerUnit = $diffDiscountVal + $ageDiscountVal + $addDiscountVal;
                $discountVal = $totalDiscountPerUnit * $qty;
                $subtotalVal = ($maxPrice - $totalDiscountPerUnit) * $qty;
                if ($subtotalVal < 0) {
                    $subtotalVal = 0.0;
                }
                $totalVal = $subtotalVal;

                $igs->update([
                    'quantity' => $qty,
                    'amount' => $priceVal,
                    'discount' => $discountVal,
                    'subtotal' => $subtotalVal,
                    'exempt_amount' => $totalVal,
                    'total' => $totalVal,
                    'selected_price' => $item['selected_price'],
                    'custom_specimen_price' => $item['selected_price'] === 'custom' ? $priceVal : 0.00,
                    'additional_discount_enabled' => ! empty($item['additional_discount_enabled']),
                    'additional_discount' => (float) ($item['additional_discount'] ?? 0.00),
                    'age_discount_type' => $item['age_discount_type'] ?? null,
                    'age_discount_amount' => $ageDiscountVal,
                ]);

                // Synchronize credit_invoice_specimens
                $cis = CreditInvoiceSpecimen::where('invoice_id', $invoice->id)
                    ->where('specimen_id', $igs->specimen_id)
                    ->first();
                if ($cis) {
                    $cis->update([
                        'quantity' => $qty,
                        'amount' => $priceVal,
                        'discount' => $discountVal,
                        'subtotal' => $subtotalVal,
                        'exempt_amount' => $totalVal,
                        'total' => $totalVal,
                        'selected_price' => $item['selected_price'],
                        'custom_specimen_price' => $item['selected_price'] === 'custom' ? $priceVal : 0.00,
                        'additional_discount_enabled' => ! empty($item['additional_discount_enabled']) ? 1 : 0,
                        'additional_discount' => (float) ($item['additional_discount'] ?? 0.00),
                        'age_discount_type' => $item['age_discount_type'] ?? null,
                        'age_discount_amount' => $ageDiscountVal,
                    ]);
                }
            }
        }

        // Update parent Credit record if present
        if ($invoice->credit_payment_id) {
            $credit = Credit::find($invoice->credit_payment_id);
            if ($credit) {
                // If it's a single specimen credit, synchronize credit_invoice_specimens
                if (! $credit->is_group && $invoice->specimen_id) {
                    $cis = CreditInvoiceSpecimen::where('credit_id', $credit->id)
                        ->where('invoice_id', $invoice->id)
                        ->where('specimen_id', $invoice->specimen_id)
                        ->first();
                    if ($cis) {
                        $cis->update([
                            'amount' => (float) $validated['amount'] - (float) ($validated['custom_amount'] ?? 0),
                            'discount' => (float) $validated['discount'],
                            'subtotal' => (float) $validated['subtotal'],
                            'exempt_amount' => (float) $validated['total'],
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
                $invoice->load(['specimen.products', 'creditRelation', 'customer', 'caiRange', 'groupSpecimens.specimen.examination', 'groupSpecimens.specimen.customerRelation', 'groupSpecimens.specimen.type.prices', 'groupSpecimens.specimen.products']);
                $totalWords = $this->numberToSpanishWords($invoice->total);

                $customer = $invoice->customer;
                $caiRange = $invoice->caiRange;
                $location = Location::find($caiRange->location_id);
                $examination = null;
                if ($invoice->specimen) {
                    $examination = SpecimenTypeExamination::find($invoice->specimen->specimen_type_examination);
                }

                $htmlContent = view('pdf.invoice', compact('invoice', 'caiRange', 'customer', 'examination', 'location', 'totalWords'))->render();

                if ($invoice->invoice_file && Storage::disk('public')->exists($invoice->invoice_file)) {
                    Storage::disk('public')->delete($invoice->invoice_file);
                }

                $filename = 'invoice_'.$invoice->id.'_'.time().'.pdf';
                $pdfPath = 'invoices/'.$filename;

                $browsershot = Browsershot::html($htmlContent);

                if (app()->environment('production')) {
                    $browsershot->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                        ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                        ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                        ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'));
                }

                $pdfContent = $browsershot->addChromiumArguments([
                    'disable-crash-reporter',
                    'disable-dev-shm-usage',
                    'no-sandbox',
                ])
                    ->noSandbox()
                    ->margins(10, 10, 10, 10)
                    ->format('A4')
                    ->pdf();

                Storage::disk('public')->put($pdfPath, $pdfContent);
                $invoice->update(['invoice_file' => $pdfPath]);
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
}
