<?php

namespace App\Http\Controllers;

use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\PrioritySpecimenOrder;
use App\Models\Product;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenGroup;
use App\Models\SpecimenGroupCustomer;
use App\Models\SpecimenTypeExamination;
use App\Services\WhatsAppService;
use Illuminate\Http\File;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Browsershot\Browsershot;

class SpecimenGroupController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'global_customer_id' => 'required|exists:customers,id',
            'payment_type' => 'required|in:cash,credit card,bank transfer,check,credit',
            'has_initial_payment' => 'nullable|boolean',
            'initial_payment_amount' => 'required_if:has_initial_payment,true|nullable|numeric|min:0.01',
            'initial_payment_type' => 'required_if:has_initial_payment,true|nullable|in:cash,credit card,bank transfer,check',
            'custom_amount_enabled' => 'nullable|boolean',
            'custom_amount' => 'nullable|numeric|min:0',
            'custom_amount_reason' => 'nullable|string|max:255',
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
            'proof_of_payment' => [
                (
                    $request->input('payment_type') === 'cash' ||
                    ($request->input('payment_type') === 'credit' && ! $request->boolean('has_initial_payment')) ||
                    ($request->input('payment_type') === 'credit' && $request->boolean('has_initial_payment') && $request->input('initial_payment_type') === 'cash')
                ) ? 'nullable' : 'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,gif',
            ],

            // Validation of specimens array
            'specimens' => 'required|array|min:1',
            'specimens.*.customer' => 'required|exists:customers,id',
            'specimens.*.specimen_type' => 'required|exists:specimen_type,id',
            'specimens.*.specimen_type_examination' => 'required|exists:specimen_type_examination,id',
            'specimens.*.specimen_category' => 'required|exists:specimen_category,id',
            'specimens.*.referrer' => 'required|exists:referrers,id',
            'specimens.*.anatomic_site' => 'nullable|string|max:255',
            'specimens.*.diagnosis' => 'nullable|string',
            'specimens.*.clinical_notes' => 'nullable|string',
            'specimens.*.status' => 'required|string',
            'specimens.*.priority_id' => 'required|exists:priorities,id',

            // Nested pricing config for each specimen
            'specimens.*.selected_price' => 'required|numeric|min:0',
            'specimens.*.age_discount_type' => 'nullable|string|in:third,fourth',
            'specimens.*.age_discount_amount' => 'nullable|numeric|min:0',
            'specimens.*.additional_discount_enabled' => 'nullable|boolean',
            'specimens.*.additional_discount' => 'nullable|numeric|min:0',

            // Insumos for each specimen
            'specimens.*.insumos' => 'nullable|array',
            'specimens.*.insumos.*.id' => 'required|exists:products,id',
            'specimens.*.insumos.*.quantity' => 'required|integer|min:1',
            'specimens.*.insumos.*.price' => 'required|numeric|min:0',
        ]);

        $group = null;
        $invoice = null;

        DB::transaction(function () use ($request, $validated, &$group, &$invoice) {
            $caiRange = CaiRange::where('status', 'active')->first();
            if (! $caiRange) {
                throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
            }

            // Calculate overall totals from specimens
            $totalAmount = 0.00;
            $totalDiscount = 0.00;
            $specimensData = $validated['specimens'];

            foreach ($specimensData as $specData) {
                $basePrice = (float) $specData['selected_price'];
                $ageDiscount = (float) ($specData['age_discount_amount'] ?? 0.00);
                $additionalDiscount = ! empty($specData['additional_discount_enabled']) ? (float) ($specData['additional_discount'] ?? 0.00) : 0.00;

                $totalAmount += $basePrice;
                $totalDiscount += $ageDiscount + $additionalDiscount;
            }

            // Add custom amount if enabled
            $isCustomAmount = ! empty($validated['custom_amount_enabled']) && (float) ($validated['custom_amount'] ?? 0) > 0;
            $customAmountVal = $isCustomAmount ? (float) $validated['custom_amount'] : 0.00;
            $customAmountReasonVal = $isCustomAmount ? ($validated['custom_amount_reason'] ?? null) : null;

            $subtotal = ($totalAmount + $customAmountVal) - $totalDiscount;
            if ($subtotal < 0) {
                $subtotal = 0.00;
            }

            if ($request->boolean('has_initial_payment') && (float) $validated['initial_payment_amount'] > $subtotal) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['El monto del pago inicial no puede superar el total de la factura (L. '.number_format($subtotal, 2).').'],
                ]);
            }

            // CAI generation
            $nextNumber = $caiRange->last_used_number + 1;
            $invoiceNumber = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
            $fullInvoiceNumber = $caiRange->full_prefix.$invoiceNumber;

            // Save proof of payment file
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

            // Credit management
            $creditId = null;
            $initialPaymentAmount = 0.00;
            $credit = null;
            if ($validated['payment_type'] === 'credit') {
                $initialPaymentAmount = $request->boolean('has_initial_payment') ? (float) $validated['initial_payment_amount'] : 0.00;
                $credit = Credit::create([
                    'customer_id' => $validated['global_customer_id'],
                    'credit_amount' => $subtotal,
                    'amount_paid' => $initialPaymentAmount,
                    'amount_remaining' => $subtotal - $initialPaymentAmount,
                    'specimen_id' => null,
                    'is_group' => true,
                    'group_id' => null,
                ]);
                $creditId = $credit->id;
            }

            $totalPaid = in_array($validated['payment_type'], ['cash', 'credit card', 'bank transfer', 'check']) ? $subtotal : $initialPaymentAmount;

            // Create primary Group Invoice
            $invoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRange->id,
                'customer_id' => $validated['global_customer_id'],
                'specimen_id' => null, // Left null since it is linked to a group
                'payment_type' => $validated['payment_type'],
                'credit_payment_id' => $creditId,
                'amount' => $totalAmount,
                'discount' => $totalDiscount,
                'subtotal' => $subtotal,
                'exempt_amount' => 0.00,
                'tax_exempt_amount' => $subtotal,
                'taxable_amount_15' => 0.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 0.00,
                'isv_18' => 0.00,
                'total' => $subtotal,
                'total_paid' => $totalPaid,
                'proof_of_payment' => $proofOfPaymentPath,
                'invoice_file' => '',
                'custom_amount' => $customAmountVal,
                'custom_amount_reason' => $customAmountReasonVal,
                'age_discount_type' => null, // Calculated at item level in grouped mode
                'age_discount_amount' => 0.00,
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
                'is_group' => true,
                'group_id' => null, // Set in the next step
            ]);

            // Get Global Customer
            $globalCustomer = Customer::findOrFail($validated['global_customer_id']);

            // Create SpecimenGroup
            $groupName = $globalCustomer->name.' - '.count($specimensData).' Muestras';
            $group = SpecimenGroup::create([
                'name' => $groupName,
                'invoice_id' => $invoice->id,
                'customer_id' => $globalCustomer->id,
                'access_token' => Str::random(32),
            ]);

            // Update Invoice and Credit with group_id
            $invoice->update(['group_id' => $group->id]);
            if ($credit) {
                $credit->update(['group_id' => $group->id]);
            }

            // Link Global Customer to Specimen Group
            SpecimenGroupCustomer::create([
                'customer_id' => $globalCustomer->id,
                'specimen_group_id' => $group->id,
            ]);

            // Create each specimen and its supplies
            $createdSpecimensDataForPdf = [];
            foreach ($specimensData as $index => $specData) {
                // Find active sequence
                $sequence = Sequence::where('location_id', $caiRange->location_id)
                    ->where('specimen_type', $specData['specimen_type'])
                    ->where('active', true)
                    ->lockForUpdate()
                    ->first();

                if (! $sequence) {
                    throw new \Exception('No hay una secuencia de numeración activa configurada para esta sucursal y tipo de muestra: '.$specData['specimen_type']);
                }

                // Find next available sequence code
                do {
                    $paddedSeq = str_pad($sequence->current_sequence, $sequence->fill ?? 4, '0', STR_PAD_LEFT);
                    $paddedMonth = str_pad($sequence->month, 2, '0', STR_PAD_LEFT);
                    $sequenceCode = $sequence->prefix.$sequence->separator.$paddedSeq.$sequence->separator.$paddedMonth.$sequence->separator.$sequence->year;

                    $exists = Specimen::where('sequence_code', $sequenceCode)->exists();
                    if ($exists) {
                        $sequence->increment('current_sequence');
                    }
                } while ($exists);

                $sequence->increment('current_sequence');

                // Handle medical order file if present
                $medOrderPath = null;
                $fileKey = "specimens.{$index}.medical_order_file";
                if ($request->hasFile($fileKey)) {
                    $medOrderPath = $this->storeUploadedFile($request->file($fileKey), 'medical_orders');
                }

                $specimen = Specimen::create([
                    'sequence_code' => $sequenceCode,
                    'customer' => $specData['customer'],
                    'specimen_type' => $specData['specimen_type'],
                    'specimen_type_examination' => $specData['specimen_type_examination'],
                    'specimen_category' => $specData['specimen_category'],
                    'referrer' => $specData['referrer'],
                    'anatomic_site' => $specData['anatomic_site'] ?? '',
                    'diagnosis' => $specData['diagnosis'] ?? '',
                    'clinical_notes' => $specData['clinical_notes'] ?? '',
                    'status' => $specData['status'],
                    'priority_id' => $specData['priority_id'],
                    'medical_order_file' => $medOrderPath,
                    'access_token' => Str::random(32),
                    'is_group' => true,
                    'group_id' => $group->id,
                ]);

                // Create Kanban Order record
                $maxOrder = PrioritySpecimenOrder::where('priority_id', $specData['priority_id'])->max('order') ?? 0;
                PrioritySpecimenOrder::create([
                    'priority_id' => $specData['priority_id'],
                    'specimen_id' => $specimen->id,
                    'order' => $maxOrder + 1,
                ]);

                // Process insumos/supplies for this specimen
                if (! empty($specData['insumos'])) {
                    foreach ($specData['insumos'] as $insumo) {
                        $specimen->products()->attach($insumo['id'], [
                            'quantity' => $insumo['quantity'],
                            'price' => $insumo['price'],
                        ]);

                        $remaining = (int) $insumo['quantity'];
                        $inventories = Inventory::where('product', $insumo['id'])
                            ->where('active', true)
                            ->where('quantity', '>', 0)
                            ->orderBy('id', 'asc')
                            ->get();

                        $totalAvailableStock = $inventories->sum('quantity');
                        if ($totalAvailableStock < $remaining) {
                            $product = Product::find($insumo['id']);
                            throw new \Exception('Stock insuficiente para el insumo: '.($product ? $product->name : 'ID '.$insumo['id']).". Solicitado: {$remaining}, Disponible: {$totalAvailableStock}.");
                        }

                        foreach ($inventories as $inv) {
                            if ($remaining <= 0) {
                                break;
                            }

                            $before = $inv->quantity;
                            if ($inv->quantity >= $remaining) {
                                $inv->quantity -= $remaining;
                                $inv->save();
                                $this->logInventoryMovement($inv, -$remaining, $before, $inv->quantity);
                                $remaining = 0;
                            } else {
                                $subtracted = $inv->quantity;
                                $remaining -= $subtracted;
                                $inv->quantity = 0;
                                $inv->save();
                                $this->logInventoryMovement($inv, -$subtracted, $before, 0);
                            }
                        }
                    }
                }

                // Add to temporary list for PDF render
                $createdSpecimensDataForPdf[] = [
                    'sequence_code' => $sequenceCode,
                    'exam_name' => SpecimenTypeExamination::find($specData['specimen_type_examination'])->name,
                    'patient_name' => Customer::find($specData['customer'])->name,
                    'price' => (float) $specData['selected_price'],
                    'discount' => (float) ($specData['age_discount_amount'] ?? 0.00) + (! empty($specData['additional_discount_enabled']) ? (float) ($specData['additional_discount'] ?? 0.00) : 0.00),
                    'age_discount_type' => $specData['age_discount_type'] ?? null,
                    'age_discount_amount' => (float) ($specData['age_discount_amount'] ?? 0.00),
                ];
            }

            // CAI tracking
            $caiRange->increment('last_used_number');
            if ($caiRange->last_used_number >= $caiRange->end_number) {
                $caiRange->update(['status' => 'exhausted']);
            }

            // Compile Group PDF Invoice
            $invoice->load(['creditRelation']);
            $totalWords = $this->numberToSpanishWords($invoice->total);
            $customer = $globalCustomer;
            $location = Location::findOrFail($caiRange->location_id);

            // We pass the explicit specimens array to handle grouping inside layout
            $htmlContent = view('pdf.invoice', [
                'invoice' => $invoice,
                'caiRange' => $caiRange,
                'customer' => $customer,
                'location' => $location,
                'totalWords' => $totalWords,
                'groupSpecimens' => $createdSpecimensDataForPdf,
            ])->render();

            $filename = 'invoice_'.$invoice->id.'_'.time().'.pdf';
            $pdfPath = 'invoices/'.$filename;

            $pdfContent = Browsershot::html($htmlContent)
                ->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'))
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

        // Enviar notificación de WhatsApp al paciente (cliente de facturación global)
        try {
            $customer = Customer::find($validated['global_customer_id']);
            if ($customer) {
                $link = route('specimen-groups.show-public', [
                    'id' => $group->id,
                    'token' => $group->access_token,
                ]);
                $patientName = $customer->name;
                $message = "Hola, {$patientName}. Su grupo de muestras ha sido registrado en Patolab. Puede ver el progreso de su análisis en el siguiente enlace: {$link}";

                $phone = $customer->phone;
                $cleanPhone = preg_replace('/\D/', '', $phone);
                if (strlen($cleanPhone) === 8) {
                    $cleanPhone = '504'.$cleanPhone;
                }

                // All messages will be sent to +504 3366-6885 while testing
                if (config('app.env') !== 'production') {
                    $cleanPhone = '50433666885';
                }

                if (! empty($cleanPhone)) {
                    $whatsapp = app(WhatsAppService::class);
                    $whatsapp->sendText($cleanPhone, $message);
                }
            }
        } catch (\Exception $e) {
            Log::error('Error enviando notificación de WhatsApp del grupo: '.$e->getMessage());
        }

        $responseData = [
            'success' => 'Grupo de muestras y factura creados con éxito.',
            'new_invoice_id' => $invoice->id,
            'new_invoice_url' => asset('storage/'.$invoice->invoice_file),
        ];

        return redirect()->back()->with($responseData);
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

    private function logInventoryMovement(Inventory $inventory, $quantityAdded, $before, $after)
    {
        InventoryMovement::create([
            'inventory_name' => $inventory->productRelation->name,
            'inventory' => $inventory->id,
            'storage_name' => $inventory->storageRelation->name,
            'storage' => $inventory->storage,
            'quantity_added' => $quantityAdded,
            'quantity_before_update' => $before,
            'quantity_after_update' => $after,
            'movement' => 'removed',
            'user_id' => Auth::id() ?? 1,
        ]);
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

    public function showPublic(Request $request, $id)
    {
        $token = $request->query('token');
        if (! $token) {
            $token = $request->input('token');
        }

        $group = SpecimenGroup::where('id', $id)
            ->where('access_token', $token)
            ->with([
                'specimens.customerRelation',
                'specimens.type',
                'specimens.examination',
                'specimens.category',
                'specimens.referrerRelation',
                'specimens.priority',
                'invoice',
                'customer',
            ])
            ->first();

        if (! $group) {
            $exists = SpecimenGroup::where('id', $id)->exists();
            if ($exists) {
                abort(403, 'Acceso no autorizado o token inválido.');
            }
            abort(404, 'Grupo de muestras no encontrado.');
        }

        return Inertia::render('specimens/public-group-progress', [
            'group' => $group,
        ]);
    }
}
