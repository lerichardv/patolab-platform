<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Rental;
use Illuminate\Http\File;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Browsershot\Browsershot;

class RentalController extends Controller
{
    /**
     * Display a listing of the rentals with search and paging.
     */
    public function index(Request $request)
    {
        $query = Rental::with(['invoices' => function ($q) {
            $q->where('invoice_type', 'rental')
              ->with('customer')
              ->orderBy('created_at', 'desc');
        }]);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('invoices', function ($iq) use ($search) {
                        $iq->where('invoice_type', 'rental')
                           ->where('full_invoice_number', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by customer (on associated invoices)
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->whereHas('invoices', function ($q) use ($request) {
                $q->where('invoice_type', 'rental')
                  ->where('customer_id', $request->get('customer_id'));
            });
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
        }

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        switch ($sortField) {
            case 'name':
                $query->orderBy('rentals.name', $sortDirection);
                break;
            case 'description':
                $query->orderBy('rentals.description', $sortDirection);
                break;
            case 'date':
            default:
                $query->orderBy('rentals.created_at', $sortDirection);
                break;
        }

        $rentals = $query->paginate(10)->withQueryString();

        $allRentals = Rental::orderBy('name', 'asc')->get();
        $customers = Customer::where('active', true)->orderBy('name', 'asc')->get();
        $banks = Bank::all();

        return Inertia::render('rentals/index', [
            'rentals' => $rentals,
            'allRentals' => $allRentals,
            'filters' => $request->only(['search', 'customer_id', 'date_from', 'date_to', 'sort_field', 'sort_direction']),
            'customers' => $customers,
            'banks' => $banks,
        ]);
    }

    /**
     * Store a newly created rental.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
        ]);

        $rental = Rental::create($validated);

        return redirect()->back()->with([
            'success' => 'Renta creada con éxito.',
            'new_rental_id' => $rental->id,
        ]);
    }

    /**
     * Update the specified rental.
     */
    public function update(Request $request, Rental $rental)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
        ]);

        $rental->update($validated);

        return redirect()->back()->with('success', 'Renta actualizada con éxito.');
    }

    /**
     * Register a payment for a rental (generating invoice and PDF).
     */
    public function pay(Request $request)
    {
        $validated = $request->validate([
            'rental_id' => 'required|integer|exists:rentals,id',
            'customer_id' => 'required_if:payment_type,credit|nullable|exists:customers,id',
            'amount' => 'required|numeric|min:0.01',
            'discount' => 'required|numeric|min:0',
            'payment_type' => 'required|in:cash,credit card,bank transfer,check,credit',
            'has_initial_payment' => 'nullable|boolean',
            'initial_payment_amount' => 'required_if:has_initial_payment,true|nullable|numeric|min:0.01',
            'initial_payment_type' => 'required_if:has_initial_payment,true|nullable|in:cash,credit card,bank transfer,check',
            'custom_amount_enabled' => 'nullable|boolean',
            'custom_amount' => 'nullable|numeric|min:0',
            'custom_amount_reason' => 'required_if:custom_amount_enabled,true|nullable|string|max:255',
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
            'description' => 'nullable|string|max:1000',
            'proof_of_payment' => [
                (
                    $request->input('payment_type') === 'cash' ||
                    ($request->input('payment_type') === 'credit' && ! $request->boolean('has_initial_payment')) ||
                    ($request->input('payment_type') === 'credit' && $request->boolean('has_initial_payment') && $request->input('initial_payment_type') === 'cash')
                ) ? 'nullable' : 'required',
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

        $invoice = null;

        DB::transaction(function () use ($request, $validated, &$invoice) {
            // Find active CAI range
            $caiRange = CaiRange::where('status', 'active')->first();
            if (! $caiRange) {
                throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
            }

            $rentalId = (int) $validated['rental_id'];
            $rental = Rental::findOrFail($rentalId);

            // Generate invoice numbers
            $nextNumber = $caiRange->last_used_number + 1;
            $invoiceNumber = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
            $fullInvoiceNumber = $caiRange->full_prefix.$invoiceNumber;

            // Save proof of payment file if provided
            $proofOfPaymentPath = null;
            if ($validated['payment_type'] === 'credit') {
                if ($request->boolean('has_initial_payment')) {
                    if (in_array($request->input('initial_payment_type'), ['credit card', 'bank transfer', 'check']) && $request->hasFile('proof_of_payment')) {
                        $proofOfPaymentPath = $this->storeUploadedFile($request->file('proof_of_payment'), 'proofs');
                    } else {
                        $proofOfPaymentPath = null;
                    }
                } else {
                    $proofOfPaymentPath = null;
                }
            } elseif ($request->hasFile('proof_of_payment')) {
                $proofOfPaymentPath = $this->storeUploadedFile($request->file('proof_of_payment'), 'proofs');
            } else {
                $proofOfPaymentPath = 'Efectivo';
            }

            $isCustomAmount = ! empty($validated['custom_amount_enabled']) && (float) ($validated['custom_amount'] ?? 0) > 0;
            $customAmountVal = $isCustomAmount ? (float) $validated['custom_amount'] : 0.00;
            $customAmountReasonVal = $isCustomAmount ? ($validated['custom_amount_reason'] ?? null) : null;

            $amount = (float) $validated['amount'];
            $discount = (float) $validated['discount'];

            // Business Rule: A 15% ISV rate is applied only to the rental subtotal
            // (rental base amount minus discount, excluding the custom extra charge).
            // This 15% tax is stored in the database's `isv_15` column.
            $rentalBaseAmount = $amount - $customAmountVal;
            $rentalSubtotal = max(0.00, $rentalBaseAmount - $discount);
            $isv15 = $rentalSubtotal * 0.15;

            // Invoice subtotal is rental subtotal plus custom amount (net amount before tax)
            $subtotal = $rentalSubtotal + $customAmountVal;
            
            // Total invoice amount is subtotal plus calculated tax
            $total = $subtotal + $isv15;

            if ($request->boolean('has_initial_payment') && (float) $validated['initial_payment_amount'] > $total) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['El monto del pago inicial no puede superar el total de la factura (L. '.number_format($total, 2).').'],
                ]);
            }

            $creditId = null;
            $initialPaymentAmount = 0.00;
            if ($validated['payment_type'] === 'credit') {
                $initialPaymentAmount = $request->boolean('has_initial_payment') ? (float) $validated['initial_payment_amount'] : 0.00;
                $credit = Credit::create([
                    'customer_id' => $validated['customer_id'],
                    'credit_amount' => $total,
                    'amount_paid' => $initialPaymentAmount,
                    'amount_remaining' => $total - $initialPaymentAmount,
                    'specimen_id' => null,
                ]);
                $creditId = $credit->id;
            }

            $totalPaid = in_array($validated['payment_type'], ['cash', 'credit card', 'bank transfer', 'check']) ? $total : $initialPaymentAmount;

            // Create Invoice
            $invoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRange->id,
                'customer_id' => $validated['customer_id'],
                'specimen_id' => null,
                'payment_type' => $validated['payment_type'],
                'credit_payment_id' => $creditId,
                'amount' => $amount,
                'discount' => $discount,
                'subtotal' => $subtotal,
                'exempt_amount' => 0.00,
                'tax_exempt_amount' => $customAmountVal, // custom amount is exempt from ISV
                'taxable_amount_15' => $rentalSubtotal, // rental subtotal subject to ISV
                'taxable_amount_18' => 0.00,
                'isv_15' => $isv15, // store the calculated 30% ISV here
                'isv_18' => 0.00,
                'total' => $total,
                'total_paid' => $totalPaid,
                'proof_of_payment' => $proofOfPaymentPath,
                'invoice_file' => '',
                'custom_amount' => $customAmountVal,
                'custom_amount_reason' => $customAmountReasonVal,
                'age_discount_type' => $validated['age_discount_type'] ?? null,
                'age_discount_amount' => (float) ($validated['age_discount_amount'] ?? 0.00),
                'payment_method_date' => $validated['payment_method_date'] ?? null,
                'cash_value' => isset($validated['cash_value']) ? (float) $validated['cash_value'] : null,
                'check_number' => $validated['check_number'] ?? null,
                'check_value' => isset($validated['check_value']) ? (float) $validated['check_value'] : null,
                'card_last_4' => $validated['card_last_4'] ?? null,
                'card_value_charged' => isset($validated['card_value_charged']) ? (float) $validated['card_value_charged'] : null,
                'card_expiration' => $validated['card_expiration'] ?? null,
                'card_authorization_code' => $validated['card_authorization_code'] ?? null,
                'transfer_bank_id' => $validated['transfer_bank_id'] ?? null,
                'transfer_value' => isset($validated['transfer_value']) ? (float) $validated['transfer_value'] : null,
                'transfer_authorization_code' => $validated['transfer_authorization_code'] ?? null,
                'invoice_type' => 'rental',
                'rental_id' => $rentalId,
                'description' => $validated['description'] ?? null,
            ]);

            // Increment CAI Range last used number
            $caiRange->increment('last_used_number');
            if ($caiRange->last_used_number >= $caiRange->end_number) {
                $caiRange->update(['status' => 'exhausted']);
            }

            // PDF Generation
            $totalWords = $this->numberToSpanishWords($invoice->total);
            if (!empty($validated['customer_id'])) {
                $customer = Customer::findOrFail($validated['customer_id']);
            } else {
                $customer = new Customer([
                    'name' => 'Consumidor Final',
                    'id_number' => 'N/A',
                    'phone' => 'N/A',
                    'email' => '',
                ]);
            }
            $location = Location::findOrFail($caiRange->location_id);

            $htmlContent = view('pdf.rental_invoice', compact('invoice', 'caiRange', 'customer', 'location', 'totalWords', 'rental'))->render();

            $filename = 'rental_invoice_'.$invoice->id.'_'.time().'.pdf';
            $pdfPath = 'invoices/'.$filename;

            $pdfContent = Browsershot::html($htmlContent)
                ->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
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
        });

        return redirect()->back()->with([
            'success' => 'Pago de renta registrado con éxito.',
            'new_invoice_id' => $invoice->id,
            'new_invoice_url' => asset('storage/'.$invoice->invoice_file),
        ]);
    }

    /**
     * Optimize and store payment proof file.
     */
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

    /**
     * Convert numeric amount to words in Spanish.
     */
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
