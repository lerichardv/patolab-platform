<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\Request;
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
        $query = Invoice::with([
            'customer',
            'caiRange',
            'specimen.type',
            'specimen.examination',
            'specimen.category',
            'specimen.referrerRelation',
            'specimen.priority',
            'creditRelation',
            'group.specimens.type',
            'group.specimens.examination',
            'group.specimens.category',
            'group.specimens.referrerRelation',
            'group.specimens.priority',
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

        // Filter by payment type
        if ($request->filled('payment_type') && $request->get('payment_type') !== 'all') {
            $query->where('payment_type', $request->get('payment_type'));
        }

        // Filter by customer
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer_id', $request->get('customer_id'));
        }

        // Filter by specimen type
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->whereHas('specimen', function ($q) use ($request) {
                $q->where('specimen_type', $request->get('specimen_type_id'));
            });
        }

        // Filter by credit status
        if ($request->filled('has_credit') && $request->get('has_credit') !== 'all') {
            if ($request->get('has_credit') === 'yes') {
                $query->whereNotNull('credit_payment_id');
            } elseif ($request->get('has_credit') === 'no') {
                $query->whereNull('credit_payment_id');
            }
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('invoices.created_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('invoices.created_at', '<=', $request->get('date_to'));
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

        $examinations = \App\Models\SpecimenTypeExamination::where('active', true)->get();
        $categories = \App\Models\SpecimenCategory::where('active', true)->get();
        $referrers = \App\Models\Referrer::where('active', true)->get();
        $referrerTypes = \App\Models\ReferrerType::where('active', true)->get();
        $priorities = \App\Models\Priority::orderBy('order', 'desc')->get();
        $locations = Location::where('active', true)->get();

        $activeCai = \App\Models\CaiRange::where('status', 'active')->first();
        $activeLocationId = $activeCai ? $activeCai->location_id : null;
        $sequences = \App\Models\Sequence::where('active', true)->get();

        $products = \App\Models\Product::where('active', true)
            ->whereHas('inventory', function($q) {
                $q->where('active', true);
            })
            ->withSum(['inventory as total_stock' => function($q) {
                $q->where('active', true);
            }], 'quantity')
            ->with('prices')
            ->get();

        return Inertia::render('invoices/index', [
            'invoices' => $invoices,
            'filters' => $request->only([
                'search', 'payment_type', 'customer_id', 'specimen_type_id',
                'has_credit', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'group_id',
            ]),
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
            'groups' => \App\Models\SpecimenGroup::orderBy('name', 'asc')->get(),
        ]);
    }

    public function export(Request $request)
    {
        $query = Invoice::with([
            'customer',
            'specimen.type',
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

        // Filter by specimen type
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->whereHas('specimen', function ($q) use ($request) {
                $q->where('specimen_type', $request->get('specimen_type_id'));
            });
        }

        // Filter by credit status
        if ($request->filled('has_credit') && $request->get('has_credit') !== 'all') {
            if ($request->get('has_credit') === 'yes') {
                $query->whereNotNull('credit_payment_id');
            } elseif ($request->get('has_credit') === 'no') {
                $query->whereNull('credit_payment_id');
            }
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('invoices.created_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('invoices.created_at', '<=', $request->get('date_to'));
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
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'payment_type' => 'required|in:cash,credit card,bank transfer,check,credit',
            'amount' => 'required|numeric|min:0',
            'discount' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'exempt_amount' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'total_paid' => 'required|numeric|min:0',
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

        $invoice->update($validated);

        if ($request->boolean('regenerate_pdf', true)) {
            try {
                $invoice->load(['specimen.products', 'creditRelation', 'customer', 'caiRange']);
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

                $pdfContent = Browsershot::html($htmlContent)
                    ->setIncludePath('$PATH:/usr/local/bin:/usr/bin')
                    ->addChromiumArguments([
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
