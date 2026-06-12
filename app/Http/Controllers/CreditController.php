<?php

namespace App\Http\Controllers;

use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use Illuminate\Http\File;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Browsershot\Browsershot;

class CreditController extends Controller
{
    public function index(Request $request)
    {
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
            $status = $request->get('status');
            if ($status === 'paid') {
                $query->where('amount_remaining', 0);
            } elseif ($status === 'partial') {
                $query->where('amount_remaining', '>', 0)
                    ->where('amount_paid', '>', 0);
            } elseif ($status === 'pending') {
                $query->where('amount_paid', 0);
            }
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

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
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

        $customers = Customer::where('active', true)->orderBy('name', 'asc')->get();
        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();

        return Inertia::render('credits/index', [
            'credits' => $credits,
            'filters' => $request->only(['search', 'status', 'customer_id', 'specimen_type_id', 'date_from', 'date_to', 'has_pending_balance', 'group_id']),
            'customers' => $customers,
            'specimenTypes' => $specimenTypes,
            'groups' => SpecimenGroup::orderBy('name', 'asc')->get(),
        ]);
    }

    public function export(Request $request)
    {
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
            $status = $request->get('status');
            if ($status === 'paid') {
                $query->where('amount_remaining', 0);
            } elseif ($status === 'partial') {
                $query->where('amount_remaining', '>', 0)
                    ->where('amount_paid', '>', 0);
            } elseif ($status === 'pending') {
                $query->where('amount_paid', 0);
            }
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

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
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
        $validated = $request->validate([
            'amount_paid' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) use ($credit) {
                    if ($value > $credit->amount_remaining) {
                        $fail('El monto a pagar (L. '.number_format($value, 2).') no puede ser mayor que el saldo restante (L. '.number_format($credit->amount_remaining, 2).').');
                    }
                },
            ],
            'payment_type' => 'required|in:cash,credit card,bank transfer,check',
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

        $invoice = null;

        DB::transaction(function () use ($request, $validated, $credit, &$invoice) {
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

            // Create payment invoice
            $invoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRange->id,
                'customer_id' => $credit->customer_id,
                'specimen_id' => $originalInvoice->specimen_id,
                'payment_type' => $validated['payment_type'],
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
                'total_paid' => $amountPaid,
                'proof_of_payment' => $proofOfPaymentPath,
                'invoice_file' => '',
                'invoice_type' => 'credit payment',
            ]);

            // Update credit values
            $credit->update([
                'amount_paid' => $credit->amount_paid + $amountPaid,
                'amount_remaining' => $credit->amount_remaining - $amountPaid,
                'last_payment_date' => now(),
            ]);
            $credit->refresh();

            // Update original invoice total_paid
            $originalInvoice->update([
                'total_paid' => $credit->amount_paid,
            ]);

            // Increment CAI Range
            $caiRange->increment('last_used_number');
            if ($caiRange->last_used_number >= $caiRange->end_number) {
                $caiRange->update(['status' => 'exhausted']);
            }

            // PDF generation
            $totalWords = $this->numberToSpanishWords($invoice->total);
            $customer = Customer::findOrFail($credit->customer_id);
            $location = Location::findOrFail($caiRange->location_id);

            // Render Blade for Credit Payment PDF
            $htmlContent = view('pdf.credit_payment_invoice', compact('invoice', 'caiRange', 'customer', 'location', 'totalWords', 'credit', 'originalInvoice'))->render();

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
            'success' => 'Pago de crédito registrado con éxito.',
            'new_invoice_id' => $invoice->id,
            'new_invoice_url' => asset('storage/'.$invoice->invoice_file),
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
        $validated = $request->validate([
            'reminder_interval_in_days' => 'required|integer|min:1',
        ]);

        $credit->reminder_interval = \Carbon\CarbonInterval::days((int) $validated['reminder_interval_in_days']);
        $credit->save();

        return redirect()->back()->with('success', 'Configuración de recordatorio de crédito actualizada con éxito.');
    }
}
