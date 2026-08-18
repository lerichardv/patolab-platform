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
use App\Models\Specimen;
use App\Models\SpecimenGroup;
use App\Models\SpecimenGroupCustomer;
use App\Models\SpecimenType;
use App\Services\DateFilterService;
use App\Services\InvoicePdfService;
use Carbon\CarbonInterval;
use Illuminate\Http\File;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Browsershot\Browsershot;

class CreditController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('credits.view');
        $query = Credit::with([
            'customer',
            'invoices.specimen.type',
            'invoices.specimen.examination',
            'invoices.specimen.category',
            'invoices.specimen.referrerRelation',
            'invoices.specimen.priority',
            'invoices.caiRange',
            'specimen',
            'group.invoice',
            'group.specimens.customerRelation',
            'group.specimens.type',
            'group.specimens.examination',
            'group.specimens.category',
            'group.specimens.referrerRelation',
            'group.specimens.priority',
            'creditInvoiceSpecimens.specimen.customerRelation',
            'creditInvoiceSpecimens.specimen.type',
            'creditInvoiceSpecimens.specimen.examination',
        ]);

        // Filter by search query (Customer name, Customer ID/RTN, sequence code, or Credit ID)
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('customer', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('id_number', 'like', "%{$search}%");
                })
                    ->orWhereHas('invoices.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    });

                if (is_numeric($search)) {
                    $q->orWhere('id', $search);
                }
            });
        }

        // Filter by credit status
        if ($request->filled('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        // Filter by customer
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer_id', $request->get('customer_id'));
        }

        // Filter by specimen type
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->whereHas('invoices.specimen', function ($sq) use ($request) {
                $sq->where('specimen_type', $request->get('specimen_type_id'));
            });
        }

        // Resolve date range from request, cookie, or default
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_credits_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_credits_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        if (! empty($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Filter by pending balance (saldo pendiente greater than zero)
        if ($request->filled('has_pending_balance') && $request->get('has_pending_balance') === 'yes') {
            $query->where('amount_remaining', '>', 0);
        }

        // Filter by specimen group
        if ($request->filled('group_id') && $request->get('group_id') !== 'all') {
            $query->where('group_id', $request->get('group_id'));
        }

        $credits = $query->latest()->paginate(10)->withQueryString();

        // Resolve the currently-filtered customer for the async combobox initial label
        $selectedCustomer = null;
        $filteredCustomerId = $request->get('customer_id');
        if ($filteredCustomerId && $filteredCustomerId !== 'all') {
            $selectedCustomer = Customer::where('id', $filteredCustomerId)
                ->select('id', 'name', 'id_number')
                ->first();
        }

        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();

        return Inertia::render('credits/index', [
            'credits' => $credits,
            'filters' => array_merge(
                $request->only(['search', 'status', 'customer_id', 'specimen_type_id', 'has_pending_balance', 'group_id']),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
            'selectedCustomer' => $selectedCustomer,
            'specimenTypes' => $specimenTypes,
            'groups' => SpecimenGroup::orderBy('name', 'asc')->get(),
            'banks' => Bank::orderBy('name', 'asc')->get(),
        ]);
    }

    public function export(Request $request)
    {
        Gate::authorize('credits.view');
        $query = Credit::with([
            'customer',
            'invoices.specimen.type',
            'invoices.specimen.examination',
            'invoices.specimen.category',
            'invoices.specimen.referrerRelation',
            'invoices.specimen.priority',
            'invoices.caiRange',
            'specimen',
            'group.invoice',
            'group.specimens.customerRelation',
            'group.specimens.type',
            'group.specimens.examination',
            'group.specimens.category',
            'group.specimens.referrerRelation',
            'group.specimens.priority',
            'creditInvoiceSpecimens.specimen.customerRelation',
            'creditInvoiceSpecimens.specimen.type',
            'creditInvoiceSpecimens.specimen.examination',
        ]);

        // Filter by search query (Customer name, Customer ID/RTN, sequence code, or Credit ID)
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('customer', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('id_number', 'like', "%{$search}%");
                })
                    ->orWhereHas('invoices.specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    });

                if (is_numeric($search)) {
                    $q->orWhere('id', $search);
                }
            });
        }

        // Filter by credit status
        if ($request->filled('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        // Filter by customer
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer_id', $request->get('customer_id'));
        }

        // Filter by specimen type
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->whereHas('invoices.specimen', function ($sq) use ($request) {
                $sq->where('specimen_type', $request->get('specimen_type_id'));
            });
        }

        // Resolve date range from request, cookie, or default for export
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_credits_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFromExport = $resolvedDates['from'];
        $dateToExport = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_credits_user_{$userId}",
                $dateFromExport,
                $dateToExport,
                $resolvedDates['range']
            ));
        }

        if (! empty($dateFromExport)) {
            $query->whereDate('created_at', '>=', $dateFromExport);
        }
        if (! empty($dateToExport)) {
            $query->whereDate('created_at', '<=', $dateToExport);
        }

        // Filter by pending balance (saldo pendiente greater than zero)
        if ($request->filled('has_pending_balance') && $request->get('has_pending_balance') === 'yes') {
            $query->where('amount_remaining', '>', 0);
        }

        $credits = $query->latest()->get();

        $format = $request->get('format', 'csv');

        if ($format === 'xlsx') {
            $spreadsheet = new Spreadsheet;
            $sheet = $spreadsheet->getActiveSheet();

            $headers = [
                'ID Crédito', 'Cliente', 'RTN/Identidad', 'Muestra',
                'Monto Crédito', 'Monto Pagado', 'Saldo Pendiente',
                'Fecha Creación', 'Estado',
            ];

            foreach ($headers as $colIndex => $headerText) {
                $sheet->setCellValue([$colIndex + 1, 1], $headerText);
            }

            $row = 2;
            foreach ($credits as $credit) {
                $originalInvoice = $credit->invoices?->first(function ($inv) {
                    return $inv->payment_type === 'credit';
                });
                $specimenCode = $originalInvoice?->specimen?->sequence_code ?? 'N/A';

                $remaining = (float) $credit->amount_remaining;
                $paid = (float) $credit->amount_paid;
                $statusText = 'Pendiente';
                if ($remaining == 0) {
                    $statusText = 'Pagado';
                } elseif ($paid > 0) {
                    $statusText = 'Pago Parcial';
                }

                $data = [
                    '#'.$credit->id,
                    $credit->customer?->name ?? 'N/A',
                    $credit->customer?->id_number ?? 'N/A',
                    $specimenCode,
                    (float) $credit->credit_amount,
                    $paid,
                    $remaining,
                    $credit->created_at->format('d/m/Y h:i A'),
                    $statusText,
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
            }, 'creditos_patolab.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'max-age=0',
            ]);
        }

        // CSV format
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="creditos_patolab.csv"',
        ];

        $callback = function () use ($credits) {
            $file = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, [
                'ID Crédito', 'Cliente', 'RTN/Identidad', 'Muestra',
                'Monto Crédito', 'Monto Pagado', 'Saldo Pendiente',
                'Fecha Creación', 'Estado',
            ]);

            foreach ($credits as $credit) {
                $originalInvoice = $credit->invoices?->first(function ($inv) {
                    return $inv->payment_type === 'credit';
                });
                $specimenCode = $originalInvoice?->specimen?->sequence_code ?? 'N/A';

                $remaining = (float) $credit->amount_remaining;
                $paid = (float) $credit->amount_paid;
                $statusText = 'Pendiente';
                if ($remaining == 0) {
                    $statusText = 'Pagado';
                } elseif ($paid > 0) {
                    $statusText = 'Pago Parcial';
                }

                fputcsv($file, [
                    '#'.$credit->id,
                    $credit->customer?->name ?? 'N/A',
                    $credit->customer?->id_number ?? 'N/A',
                    $specimenCode,
                    number_format((float) $credit->credit_amount, 2, '.', ''),
                    number_format($paid, 2, '.', ''),
                    number_format($remaining, 2, '.', ''),
                    $credit->created_at->format('d/m/Y h:i A'),
                    $statusText,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function pay(Request $request, Credit $credit)
    {
        Gate::authorize('credits.manage');
        $isSocialSecurity = $request->boolean('is_social_security');

        $validated = $request->validate([
            'amount_paid' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) use ($credit) {
                    if ($value > $credit->amount_remaining) {
                        $fail('El monto (L. '.number_format($value, 2).') no puede ser mayor que el saldo restante (L. '.number_format($credit->amount_remaining, 2).').');
                    }
                },
            ],
            'payment_type' => $isSocialSecurity ? 'required|in:n/a' : 'required|in:cash,credit card,bank transfer,check',
            'is_social_security' => 'nullable|boolean',
            'payment_method_date' => 'nullable|date',
            'cash_value' => 'nullable|numeric|min:0',
            'check_number' => 'nullable|string|max:100',
            'check_value' => 'nullable|numeric|min:0',
            'card_last_4' => 'nullable|digits:4',
            'card_value_charged' => 'nullable|numeric|min:0',
            'card_expiration' => 'nullable|string|max:10',
            'card_authorization_code' => 'nullable|string|max:100',
            'transfer_bank_id' => 'nullable|exists:banks,id',
            'transfer_value' => 'nullable|numeric|min:0',
            'transfer_authorization_code' => 'nullable|string|max:100',
            'proof_of_payment' => [
                ($isSocialSecurity || $request->input('payment_type') === 'cash') ? 'nullable' : 'required',
                'file',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $mime = $value->getMimeType();
                        $isImage = str_starts_with($mime, 'image/');
                        $sizeInKb = $value->getSize() / 1024;
                        if ($isImage) {
                            if ($sizeInKb > 10240) {
                                $fail('El archivo de comprobante no debe superar los 10 MB.');
                            }
                        } else {
                            if ($sizeInKb > 30720) {
                                $fail('El archivo de comprobante no debe superar los 30 MB.');
                            }
                        }
                    }
                },
            ],
            'specimen_ids' => 'nullable|array',
            'specimen_ids.*' => 'exists:specimen,id',
            'specimens' => $credit->is_group ? 'required|array|min:1' : 'nullable|array',
            'specimens.*.id' => 'required|exists:specimen,id',
            'specimens.*.quantity' => 'required|integer|min:1',
        ]);

        if ($credit->is_group) {
            $specimens = $validated['specimens'] ?? [];
            $specimenIds = array_column($specimens, 'id');
            $dbSpecimens = DB::table('credit_invoice_specimens')
                ->where('credit_id', $credit->id)
                ->whereIn('specimen_id', $specimenIds)
                ->where('is_paid', 0)
                ->get()
                ->keyBy('specimen_id');

            if (count($dbSpecimens) !== count($specimenIds)) {
                throw ValidationException::withMessages([
                    'specimens' => ['Uno o más especímenes seleccionados no son válidos o ya han sido pagados.'],
                ]);
            }

            foreach ($specimens as $item) {
                $dbSpec = $dbSpecimens->get($item['id']);
                $remaining = $dbSpec->quantity - $dbSpec->quantity_paid;
                if ($item['quantity'] > $remaining) {
                    throw ValidationException::withMessages([
                        'specimens' => ["La cantidad a pagar para la muestra con ID {$dbSpec->specimen_id} supera la cantidad pendiente ({$remaining})."],
                    ]);
                }
            }
        }

        $invoice = null;

        DB::transaction(function () use ($request, $validated, $credit, $isSocialSecurity, &$invoice) {
            $caiRange = CaiRange::where('status', 'active')->first();
            if (! $caiRange) {
                throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
            }

            // Get original invoice to fetch the specimen_id
            $originalInvoice = Invoice::where('credit_payment_id', $credit->id)
                ->where('payment_type', 'credit')
                ->first();

            if (! $originalInvoice) {
                throw new \Exception('No se pudo encontrar la factura original del crédito.');
            }

            $nextNumber = $caiRange->last_used_number + 1;
            $invoiceNumber = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
            $fullInvoiceNumber = $caiRange->full_prefix.$invoiceNumber;

            $proofOfPaymentPath = '';
            if ($request->hasFile('proof_of_payment')) {
                $proofOfPaymentPath = $this->storeUploadedFile($request->file('proof_of_payment'), 'proofs');
            }

            $amountPaid = (float) $validated['amount_paid'];

            // Update specimen payment quantities only if NOT social security invoice
            if (! $isSocialSecurity) {
                if ($credit->is_group) {
                    foreach ($validated['specimens'] as $item) {
                        $dbRow = DB::table('credit_invoice_specimens')
                            ->where('credit_id', $credit->id)
                            ->where('specimen_id', $item['id'])
                            ->first();

                        $newQtyPaid = $dbRow->quantity_paid + (int) $item['quantity'];
                        $isPaid = $newQtyPaid >= $dbRow->quantity ? 1 : 0;

                        DB::table('credit_invoice_specimens')
                            ->where('credit_id', $credit->id)
                            ->where('specimen_id', $item['id'])
                            ->update([
                                'quantity_paid' => $newQtyPaid,
                                'is_paid' => $isPaid,
                                'updated_at' => now(),
                            ]);
                    }
                }
            }

            // Create payment invoice
            $invoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRange->id,
                'customer_id' => $credit->customer_id,
                'created_by_id' => auth()->id(),
                'specimen_id' => $credit->is_group ? null : $originalInvoice->specimen_id,
                'payment_type' => $isSocialSecurity ? 'n/a' : $validated['payment_type'],
                'invoice_date' => $fullInvoiceNumber ? now() : null,
                'payment_method_date' => $request->input('payment_method_date'),
                'cash_value' => $isSocialSecurity ? null : $request->input('cash_value'),
                'check_number' => $isSocialSecurity ? null : $request->input('check_number'),
                'check_value' => $isSocialSecurity ? null : $request->input('check_value'),
                'card_last_4' => $isSocialSecurity ? null : $request->input('card_last_4'),
                'card_value_charged' => $isSocialSecurity ? null : $request->input('card_value_charged'),
                'card_expiration' => $isSocialSecurity ? null : $request->input('card_expiration'),
                'card_authorization_code' => $isSocialSecurity ? null : $request->input('card_authorization_code'),
                'transfer_bank_id' => $isSocialSecurity ? null : ($request->input('transfer_bank_id') ?: null),
                'transfer_value' => $isSocialSecurity ? null : $request->input('transfer_value'),
                'transfer_authorization_code' => $isSocialSecurity ? null : $request->input('transfer_authorization_code'),
                'credit_payment_id' => $credit->id,
                'amount' => $amountPaid,
                'discount' => 0.00,
                'subtotal' => $amountPaid,
                'exempt_amount' => 0.00,
                'tax_exempt_amount' => $amountPaid,
                'taxable_amount_15' => 0.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 0.00,
                'isv_18' => 0.00,
                'total' => $amountPaid,
                'total_paid' => $isSocialSecurity ? 0.00 : $amountPaid,
                'proof_of_payment' => $proofOfPaymentPath,
                'invoice_file' => '',
                'invoice_type' => $isSocialSecurity ? 'social security' : 'credit payment',
                'is_group' => $credit->is_group ? true : false,
                'group_id' => $credit->is_group ? $credit->group_id : null,
            ]);

            // Update credit values only if NOT social security
            if (! $isSocialSecurity) {
                $newRemaining = $credit->amount_remaining - $amountPaid;
                $newPaid = $credit->amount_paid + $amountPaid;
                $newStatus = $newRemaining <= 0 ? 'paid' : ($newPaid > 0 ? 'partial' : 'pending');

                $credit->update([
                    'amount_paid' => $newPaid,
                    'amount_remaining' => $newRemaining,
                    'last_payment_date' => now(),
                    'status' => $newStatus,
                ]);
                $credit->refresh();
            }

            // Increment CAI Range
            $caiRange->increment('last_used_number');
            if ($caiRange->last_used_number >= $caiRange->end_number) {
                $caiRange->update(['status' => 'exhausted']);
            }

            // PDF generation
            $totalWords = $this->numberToSpanishWords($invoice->total);
            $customer = Customer::findOrFail($credit->customer_id);
            $location = Location::findOrFail($caiRange->location_id);

            // Fetch the specimens being paid in this transaction for the PDF
            $paidSpecimens = [];
            $paidSpecimensData = [];
            if ($credit->is_group) {
                $specimenIds = array_column($validated['specimens'], 'id');
                $paidSpecimens = Specimen::whereIn('id', $specimenIds)
                    ->with(['type', 'examination'])
                    ->get();
                foreach ($validated['specimens'] as $item) {
                    $paidSpecimensData[$item['id']] = (int) $item['quantity'];
                }
            }

            // Render Blade for Credit Payment PDF
            $htmlContent = view('pdf.credit_payment_invoice', compact('invoice', 'caiRange', 'customer', 'location', 'totalWords', 'credit', 'originalInvoice', 'paidSpecimens', 'paidSpecimensData'))->render();

            $filename = 'credit_invoice_'.$invoice->id.'_'.time().'.pdf';
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
        });

        return redirect()->back()->with([
            'success' => $isSocialSecurity ? 'Factura para seguro generada con éxito.' : 'Pago de crédito registrado con éxito.',
            'new_invoice_id' => $invoice->id,
            'new_invoice_url' => asset('storage/'.$invoice->invoice_file),
        ]);
    }

    public function payFinal(Request $request, Credit $credit)
    {
        Gate::authorize('credits.manage');

        $validated = $request->validate([
            'amount_paid' => [
                'required',
                'numeric',
                function ($attribute, $value, $fail) use ($credit) {
                    if (abs($value - $credit->amount_remaining) > 0.01) {
                        $fail('El pago final debe liquidar el saldo restante por completo (L. '.number_format($credit->amount_remaining, 2).').');
                    }
                },
            ],
            'specimens' => $credit->is_group ? 'required|array|min:1' : 'nullable|array',
            'specimens.*.id' => 'required|exists:specimen,id',
            'specimens.*.quantity' => 'required|integer|min:1',
        ]);

        $originalInvoice = Invoice::where('credit_payment_id', $credit->id)
            ->where('payment_type', 'credit')
            ->first();

        if (! $originalInvoice) {
            $originalInvoice = Invoice::where('credit_payment_id', $credit->id)->first();
        }

        if (! $originalInvoice && $credit->group_id) {
            $originalInvoice = Invoice::where('group_id', $credit->group_id)->first();
        }

        if (! $originalInvoice) {
            throw new \Exception('No se pudo encontrar la factura original del crédito.');
        }

        DB::transaction(function () use ($validated, $credit, $originalInvoice) {
            $invoiceUpdateData = [
                'invoice_date' => now(),
                'total_paid' => $originalInvoice->total,
            ];

            // If the invoice does not already have an invoice number, full invoice number, and cai range id, assign them from the active CAI range
            if (empty($originalInvoice->invoice_number) || empty($originalInvoice->full_invoice_number) || empty($originalInvoice->cai_range_id)) {
                // Get CAI range
                $caiRange = CaiRange::where('status', 'active')->first();
                if (! $caiRange) {
                    throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
                }

                $nextNumber = $caiRange->last_used_number + 1;
                $invoiceNumber = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
                $fullInvoiceNumber = $caiRange->full_prefix.$invoiceNumber;

                // Update CAI Range
                $caiRange->increment('last_used_number');
                if ($caiRange->last_used_number >= $caiRange->end_number) {
                    $caiRange->update(['status' => 'exhausted']);
                }

                $invoiceUpdateData['cai_range_id'] = $caiRange->id;
                $invoiceUpdateData['invoice_number'] = $invoiceNumber;
                $invoiceUpdateData['full_invoice_number'] = $fullInvoiceNumber;
            }

            // Update specimen group payments if applicable
            if ($credit->is_group && ! empty($validated['specimens'])) {
                foreach ($validated['specimens'] as $item) {
                    $dbRow = DB::table('credit_invoice_specimens')
                        ->where('credit_id', $credit->id)
                        ->where('specimen_id', $item['id'])
                        ->first();

                    if ($dbRow) {
                        DB::table('credit_invoice_specimens')
                            ->where('credit_id', $credit->id)
                            ->where('specimen_id', $item['id'])
                            ->update([
                                'quantity_paid' => $dbRow->quantity,
                                'is_paid' => 1,
                                'updated_at' => now(),
                            ]);
                    }
                }
            }

            // Update original invoice details
            $originalInvoice->update($invoiceUpdateData);

            // Update credit
            $credit->update([
                'amount_paid' => $credit->credit_amount,
                'amount_remaining' => 0.00,
                'last_payment_date' => now(),
                'status' => 'invoice generated',
            ]);

            // PDF generation
            $originalInvoice->refresh();
            app(InvoicePdfService::class)->generateAndStoreInvoice($originalInvoice);
        });

        return redirect()->back()->with([
            'success' => 'Factura final de crédito generada con éxito.',
            'new_invoice_id' => $originalInvoice->id,
            'new_invoice_url' => asset('storage/'.$originalInvoice->invoice_file),
        ]);
    }

    protected function storeUploadedFile(UploadedFile $file, string $folder): string
    {
        $mime = $file->getMimeType();
        if (! str_starts_with($mime, 'image/')) {
            return $file->store($folder, 'public');
        }

        $gdImage = null;
        if ($mime === 'image/jpeg' || $mime === 'image/jpg') {
            $gdImage = @imagecreatefromjpeg($file->getRealPath());
        } elseif ($mime === 'image/png') {
            $gdImage = @imagecreatefrompng($file->getRealPath());
        } elseif ($mime === 'image/gif') {
            $gdImage = @imagecreatefromgif($file->getRealPath());
        } elseif ($mime === 'image/webp') {
            if (function_exists('imagecreatefromwebp')) {
                $gdImage = @imagecreatefromwebp($file->getRealPath());
            }
        }

        if (! $gdImage) {
            return $file->store($folder, 'public');
        }

        $originalWidth = imagesx($gdImage);
        $originalHeight = imagesy($gdImage);

        $minScale = 1.0;
        if ($originalWidth > 1000 && $originalHeight > 1000) {
            $minScale = max(1000 / $originalWidth, 1000 / $originalHeight);
        }

        $quality = 90;
        $scale = 1.0;
        $tempPath = tempnam(sys_get_temp_dir(), 'img_opt_');

        while (true) {
            $w = (int) ($originalWidth * $scale);
            $h = (int) ($originalHeight * $scale);

            $tmpImg = imagecreatetruecolor($w, $h);
            imagefill($tmpImg, 0, 0, imagecolorallocate($tmpImg, 255, 255, 255));
            imagecopyresampled($tmpImg, $gdImage, 0, 0, 0, 0, $w, $h, $originalWidth, $originalHeight);

            imagejpeg($tmpImg, $tempPath, $quality);
            imagedestroy($tmpImg);

            $filesize = filesize($tempPath);

            if ($filesize <= 300 * 1024) {
                break;
            }

            if ($scale > $minScale) {
                $scale = max($minScale, $scale - 0.1);

                continue;
            }

            if ($quality > 10) {
                $quality -= 10;

                continue;
            }

            break;
        }

        imagedestroy($gdImage);

        $filename = Str::random(40).'.jpg';
        Storage::disk('public')->putFileAs($folder, new File($tempPath), $filename);
        @unlink($tempPath);

        return $folder.'/'.$filename;
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

    public function update(Request $request, Credit $credit)
    {
        Gate::authorize('credits.manage');
        $validated = $request->validate([
            'reminder_interval_in_days' => 'required|integer|min:1',
        ]);

        $credit->reminder_interval = CarbonInterval::days((int) $validated['reminder_interval_in_days']);
        $credit->save();

        return redirect()->back()->with('success', 'Configuración de recordatorio de crédito actualizada con éxito.');
    }

    public function extractSpecimens(Request $request, Credit $credit)
    {
        Gate::authorize('credits.manage');

        $validated = $request->validate([
            'specimen_ids' => 'required|array|min:1',
            'specimen_ids.*' => 'required|integer|exists:specimen,id',
            'is_social_security' => 'nullable|boolean',
        ]);

        $isSocialSecurity = $request->boolean('is_social_security');
        $specimenIdsToExtract = array_values(array_unique(array_map('intval', $validated['specimen_ids'])));

        if (! $credit->is_group || ! $credit->group_id) {
            throw ValidationException::withMessages([
                'specimen_ids' => ['Esta acción solo se puede realizar en créditos de grupos de muestras.'],
            ]);
        }

        if ((float) $credit->amount_remaining <= 0) {
            throw ValidationException::withMessages([
                'specimen_ids' => ['El crédito ya ha sido pagado en su totalidad.'],
            ]);
        }

        $group = SpecimenGroup::with(['specimens', 'invoice', 'invoiceGroupSpecimens'])->findOrFail($credit->group_id);
        $originalInvoice = Invoice::where('credit_payment_id', $credit->id)->where('payment_type', 'credit')->first()
            ?? $group->invoice;

        if (! $originalInvoice) {
            throw new \Exception('No se pudo encontrar la factura original del crédito grupal.');
        }

        $allCreditSpecimens = CreditInvoiceSpecimen::where('credit_id', $credit->id)->get();
        if ($allCreditSpecimens->isNotEmpty()) {
            $allSpecimenIds = $allCreditSpecimens->pluck('specimen_id')->toArray();
        } else {
            $allSpecimenIds = $group->specimens->pluck('id')->toArray();
        }

        foreach ($specimenIdsToExtract as $id) {
            if (! in_array($id, $allSpecimenIds)) {
                throw ValidationException::withMessages([
                    'specimen_ids' => ["La muestra #{$id} no pertenece a este crédito grupal."],
                ]);
            }
        }

        if (count($specimenIdsToExtract) >= count($allSpecimenIds)) {
            throw ValidationException::withMessages([
                'specimen_ids' => ['No se pueden extraer todas las muestras del grupo. Debe quedar al menos una muestra en el grupo original.'],
            ]);
        }

        $paidExtracted = $allCreditSpecimens->whereIn('specimen_id', $specimenIdsToExtract)->where('is_paid', true);
        if ($paidExtracted->isNotEmpty()) {
            throw ValidationException::withMessages([
                'specimen_ids' => ['No se pueden extraer muestras que ya han sido pagadas.'],
            ]);
        }

        $newInvoice = null;
        $newCredit = null;

        DB::transaction(function () use (
            $credit,
            $group,
            $originalInvoice,
            $specimenIdsToExtract,
            $isSocialSecurity,
            &$newInvoice,
            &$newCredit
        ) {
            $extractedIgs = InvoiceGroupSpecimen::where('invoice_id', $originalInvoice->id)
                ->whereIn('specimen_id', $specimenIdsToExtract)
                ->get();

            $extractedAmount = (float) $extractedIgs->sum('amount');
            $extractedDiscount = (float) $extractedIgs->sum('discount');
            $extractedSubtotal = (float) $extractedIgs->sum('subtotal');
            $extractedExempt = (float) $extractedIgs->sum('exempt_amount');
            $extractedTax15 = (float) $extractedIgs->sum('taxable_amount_15');
            $extractedTax18 = (float) $extractedIgs->sum('taxable_amount_18');
            $extractedIsv15 = (float) $extractedIgs->sum('isv_15');
            $extractedIsv18 = (float) $extractedIgs->sum('isv_18');
            $extractedTotal = (float) $extractedIgs->sum('total');
            $extractedQty = (int) $extractedIgs->sum('quantity');

            $caiRangeId = null;
            $invoiceNumber = null;
            $fullInvoiceNumber = null;
            $invoiceDate = null;
            $invoiceType = 'specimen';

            if ($isSocialSecurity) {
                $caiRange = CaiRange::where('status', 'active')->first();
                if (! $caiRange) {
                    throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
                }

                $nextNumber = $caiRange->last_used_number + 1;
                $invoiceNumber = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
                $fullInvoiceNumber = $caiRange->full_prefix.$invoiceNumber;

                $caiRange->increment('last_used_number');
                if ($caiRange->last_used_number >= $caiRange->end_number) {
                    $caiRange->update(['status' => 'exhausted']);
                }

                $caiRangeId = $caiRange->id;
                $invoiceDate = now();
                $invoiceType = 'social security';
            }

            $extractedCount = count($specimenIdsToExtract);
            $targetCustomerId = $group->customer_id ?? $credit->customer_id ?? $originalInvoice->customer_id;
            $targetCustomer = Customer::find($targetCustomerId) ?? $group->customer ?? $credit->customer;

            $newCredit = Credit::create([
                'customer_id' => $targetCustomerId,
                'credit_amount' => $extractedTotal,
                'amount_paid' => 0.00,
                'amount_remaining' => $extractedTotal,
                'specimen_id' => null,
                'is_group' => true,
                'group_id' => null,
                'reminder_interval_in_seconds' => $credit->reminder_interval_in_seconds ?? 604800,
            ]);

            $newInvoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRangeId,
                'customer_id' => $targetCustomerId,
                'specimen_id' => null,
                'created_by_id' => auth()->id(),
                'payment_type' => 'credit',
                'credit_payment_id' => $newCredit->id,
                'invoice_date' => $invoiceDate,
                'quantity' => $extractedQty ?: $extractedCount,
                'amount' => $extractedAmount,
                'discount' => $extractedDiscount,
                'subtotal' => $extractedSubtotal,
                'exempt_amount' => $extractedExempt,
                'tax_exempt_amount' => $extractedSubtotal,
                'taxable_amount_15' => $extractedTax15,
                'taxable_amount_18' => $extractedTax18,
                'isv_15' => $extractedIsv15,
                'isv_18' => $extractedIsv18,
                'total' => $extractedTotal,
                'total_paid' => 0.00,
                'invoice_file' => '',
                'is_group' => true,
                'group_id' => null,
                'invoice_type' => $invoiceType,
            ]);

            $newGroupName = ($targetCustomer ? $targetCustomer->name : 'Grupo').' - '.$extractedCount.' '.($extractedCount === 1 ? 'Muestra' : 'Muestras');
            $newGroup = SpecimenGroup::create([
                'name' => $newGroupName,
                'invoice_id' => $newInvoice->id,
                'customer_id' => $targetCustomerId,
                'access_token' => Str::random(32),
            ]);

            $newInvoice->update(['group_id' => $newGroup->id]);
            $newCredit->update(['group_id' => $newGroup->id]);

            SpecimenGroupCustomer::firstOrCreate([
                'customer_id' => $targetCustomerId,
                'specimen_group_id' => $newGroup->id,
            ]);

            Specimen::whereIn('id', $specimenIdsToExtract)->update([
                'is_group' => true,
                'group_id' => $newGroup->id,
            ]);

            foreach ($extractedIgs as $oldIgs) {
                InvoiceGroupSpecimen::create([
                    'invoice_id' => $newInvoice->id,
                    'group_id' => $newGroup->id,
                    'specimen_id' => $oldIgs->specimen_id,
                    'quantity' => $oldIgs->quantity,
                    'amount' => $oldIgs->amount,
                    'discount' => $oldIgs->discount,
                    'subtotal' => $oldIgs->subtotal,
                    'exempt_amount' => $oldIgs->exempt_amount,
                    'taxable_amount_15' => $oldIgs->taxable_amount_15,
                    'taxable_amount_18' => $oldIgs->taxable_amount_18,
                    'isv_15' => $oldIgs->isv_15,
                    'isv_18' => $oldIgs->isv_18,
                    'total' => $oldIgs->total,
                    'selected_price' => $oldIgs->selected_price,
                    'custom_specimen_price' => $oldIgs->custom_specimen_price,
                    'additional_discount_enabled' => $oldIgs->additional_discount_enabled,
                    'additional_discount' => $oldIgs->additional_discount,
                    'age_discount_type' => $oldIgs->age_discount_type,
                    'age_discount_amount' => $oldIgs->age_discount_amount,
                ]);

                CreditInvoiceSpecimen::create([
                    'credit_id' => $newCredit->id,
                    'invoice_id' => $newInvoice->id,
                    'specimen_id' => $oldIgs->specimen_id,
                    'is_paid' => 0,
                    'quantity' => $oldIgs->quantity,
                    'quantity_paid' => 0,
                    'amount' => $oldIgs->amount,
                    'discount' => $oldIgs->discount,
                    'subtotal' => $oldIgs->subtotal,
                    'exempt_amount' => $oldIgs->exempt_amount,
                    'taxable_amount_15' => $oldIgs->taxable_amount_15,
                    'taxable_amount_18' => $oldIgs->taxable_amount_18,
                    'isv_15' => $oldIgs->isv_15,
                    'isv_18' => $oldIgs->isv_18,
                    'total' => $oldIgs->total,
                    'selected_price' => $oldIgs->selected_price,
                    'custom_specimen_price' => $oldIgs->custom_specimen_price,
                    'additional_discount_enabled' => $oldIgs->additional_discount_enabled,
                    'additional_discount' => $oldIgs->additional_discount,
                    'age_discount_type' => $oldIgs->age_discount_type,
                    'age_discount_amount' => $oldIgs->age_discount_amount,
                ]);
            }

            InvoiceGroupSpecimen::where('invoice_id', $originalInvoice->id)
                ->whereIn('specimen_id', $specimenIdsToExtract)
                ->delete();

            CreditInvoiceSpecimen::where('credit_id', $credit->id)
                ->whereIn('specimen_id', $specimenIdsToExtract)
                ->delete();

            $remainingIgs = InvoiceGroupSpecimen::where('invoice_id', $originalInvoice->id)->get();

            $newOriginalAmount = (float) $remainingIgs->sum('amount');
            $newOriginalDiscount = (float) $remainingIgs->sum('discount');
            $newOriginalSubtotal = (float) $remainingIgs->sum('subtotal');
            $newOriginalExempt = (float) $remainingIgs->sum('exempt_amount');
            $newOriginalTax15 = (float) $remainingIgs->sum('taxable_amount_15');
            $newOriginalTax18 = (float) $remainingIgs->sum('taxable_amount_18');
            $newOriginalIsv15 = (float) $remainingIgs->sum('isv_15');
            $newOriginalIsv18 = (float) $remainingIgs->sum('isv_18');
            $newOriginalTotal = (float) $remainingIgs->sum('total');
            $newOriginalQty = (int) $remainingIgs->sum('quantity');

            $originalInvoice->update([
                'amount' => $newOriginalAmount,
                'discount' => $newOriginalDiscount,
                'subtotal' => $newOriginalSubtotal,
                'exempt_amount' => $newOriginalExempt,
                'tax_exempt_amount' => $newOriginalSubtotal,
                'taxable_amount_15' => $newOriginalTax15,
                'taxable_amount_18' => $newOriginalTax18,
                'isv_15' => $newOriginalIsv15,
                'isv_18' => $newOriginalIsv18,
                'total' => $newOriginalTotal,
                'quantity' => $newOriginalQty ?: $remainingIgs->count(),
            ]);

            $newRemaining = max(0, $newOriginalTotal - (float) $credit->amount_paid);

            $credit->update([
                'credit_amount' => $newOriginalTotal,
                'amount_remaining' => $newRemaining,
            ]);

            if ($group) {
                $remainingCount = $remainingIgs->count();
                $group->update([
                    'name' => ($group->customer ? $group->customer->name : 'Grupo').' - '.$remainingCount.' '.($remainingCount === 1 ? 'Muestra' : 'Muestras'),
                ]);
            }
        });

        if ($newInvoice) {
            try {
                app(InvoicePdfService::class)->generateAndStoreInvoice($newInvoice);
            } catch (\Exception $e) {
                \Log::warning('Error generating new invoice PDF: '.$e->getMessage());
            }
        }

        if ($originalInvoice) {
            try {
                app(InvoicePdfService::class)->generateAndStoreInvoice($originalInvoice);
            } catch (\Exception $e) {
                \Log::warning('Error regenerating original invoice PDF: '.$e->getMessage());
            }
        }

        return redirect()->back()->with([
            'success' => 'Muestra(s) extraída(s) del grupo con éxito.',
            'new_invoice_id' => $newInvoice?->id,
            'new_invoice_url' => $newInvoice?->invoice_file ? asset('storage/'.$newInvoice->invoice_file) : null,
        ]);
    }

    public function markAsPaid(Request $request, Credit $credit)
    {
        Gate::authorize('credits.manage');

        $validated = $request->validate([
            'payment_type' => 'required|in:cash,credit card,bank transfer,check',
            'payment_method_date' => 'nullable|date',
            'cash_value' => 'nullable|numeric|min:0',
            'check_number' => 'nullable|string|max:100',
            'check_value' => 'nullable|numeric|min:0',
            'card_last_4' => 'nullable|digits:4',
            'card_value_charged' => 'nullable|numeric|min:0',
            'card_expiration' => 'nullable|string|max:10',
            'card_authorization_code' => 'nullable|string|max:100',
            'transfer_bank_id' => 'nullable|exists:banks,id',
            'transfer_value' => 'nullable|numeric|min:0',
            'transfer_authorization_code' => 'nullable|string|max:100',
            'proof_of_payment' => [
                $request->input('payment_type') === 'cash' ? 'nullable' : 'required',
                'file',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $mime = $value->getMimeType();
                        $isImage = str_starts_with($mime, 'image/');
                        $sizeInKb = $value->getSize() / 1024;
                        if ($isImage) {
                            if ($sizeInKb > 10240) {
                                $fail('El archivo de comprobante no debe superar los 10 MB.');
                            }
                        } else {
                            if ($sizeInKb > 30720) {
                                $fail('El archivo de comprobante no debe superar los 30 MB.');
                            }
                        }
                    }
                },
            ],
        ]);

        $originalInvoice = Invoice::where('credit_payment_id', $credit->id)
            ->where('payment_type', 'credit')
            ->first();

        if (! $originalInvoice) {
            $originalInvoice = Invoice::where('credit_payment_id', $credit->id)->first();
        }

        DB::transaction(function () use ($request, $validated, $credit, $originalInvoice) {
            $proofOfPaymentPath = $originalInvoice?->proof_of_payment;
            if ($request->hasFile('proof_of_payment')) {
                $proofOfPaymentPath = $this->storeUploadedFile($request->file('proof_of_payment'), 'proofs');
            }

            if ($originalInvoice) {
                $amountPaid = (float) ($credit->credit_amount ?: $originalInvoice->total);
                $originalInvoice->update([
                    'payment_type' => $validated['payment_type'],
                    'total_paid' => $originalInvoice->total,
                    'proof_of_payment' => $proofOfPaymentPath,
                    'payment_method_date' => $request->input('payment_method_date'),
                    'cash_value' => $request->input('payment_type') === 'cash' ? ($request->input('cash_value') ? (float) $request->input('cash_value') : $amountPaid) : null,
                    'check_number' => $request->input('payment_type') === 'check' ? $request->input('check_number') : null,
                    'check_value' => $request->input('payment_type') === 'check' ? ($request->input('check_value') ? (float) $request->input('check_value') : $amountPaid) : null,
                    'card_last_4' => $request->input('payment_type') === 'credit card' ? $request->input('card_last_4') : null,
                    'card_value_charged' => $request->input('payment_type') === 'credit card' ? ($request->input('card_value_charged') ? (float) $request->input('card_value_charged') : $amountPaid) : null,
                    'card_expiration' => $request->input('payment_type') === 'credit card' ? $request->input('card_expiration') : null,
                    'card_authorization_code' => $request->input('payment_type') === 'credit card' ? $request->input('card_authorization_code') : null,
                    'transfer_bank_id' => $request->input('payment_type') === 'bank transfer' ? $request->input('transfer_bank_id') : null,
                    'transfer_value' => $request->input('payment_type') === 'bank transfer' ? ($request->input('transfer_value') ? (float) $request->input('transfer_value') : $amountPaid) : null,
                    'transfer_authorization_code' => $request->input('payment_type') === 'bank transfer' ? $request->input('transfer_authorization_code') : null,
                ]);

                try {
                    $originalInvoice->refresh();
                    app(InvoicePdfService::class)->generateAndStoreInvoice($originalInvoice);
                } catch (\Exception $e) {
                    \Log::warning('Error regenerating invoice PDF on markAsPaid: '.$e->getMessage());
                }
            }

            $credit->update([
                'status' => 'paid',
                'last_payment_date' => now(),
            ]);
        });

        return redirect()->back()->with([
            'success' => 'Crédito marcado como pagado con éxito.',
            'new_invoice_id' => $originalInvoice?->id,
            'new_invoice_url' => $originalInvoice?->invoice_file ? asset('storage/'.$originalInvoice->invoice_file) : null,
        ]);
    }
}
