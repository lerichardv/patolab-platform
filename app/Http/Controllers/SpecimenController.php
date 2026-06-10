<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Priority;
use App\Models\PrioritySpecimenOrder;
use App\Models\Product;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Sequence;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\ImageOptimizerService;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Browsershot\Browsershot;

class SpecimenController extends Controller
{
    public function index()
    {
        $priorities = Priority::orderBy('order', 'desc')->get();

        $priorities->load(['specimens' => function ($q) {
            $q->where('specimen.active', true)
                ->with(['customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'invoiceRelation.creditRelation', 'invoiceRelation.transferBank', 'users', 'group.invoice.creditRelation', 'group.invoice.transferBank'])
                ->leftJoin(\DB::raw('(SELECT specimen_id, priority_id, MIN(`order`) as board_order FROM priorities_specimens_order GROUP BY specimen_id, priority_id) as pso'), function ($join) {
                    $join->on('specimen.id', '=', 'pso.specimen_id')
                        ->on('specimen.priority_id', '=', 'pso.priority_id');
                })
                ->select('specimen.*', 'pso.board_order')
                ->orderBy('board_order', 'asc')
                ->orderBy('specimen.created_at', 'desc');
        }]);

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

        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologists = [];
        if ($pathologistRoleId) {
            $pathologists = User::where('active', true)->where('role_id', $pathologistRoleId)->get();
        }

        return Inertia::render('specimens/index', [
            'priorities' => $priorities,
            'customers' => Customer::where('active', true)->get(),
            'specimenTypes' => SpecimenType::where('active', true)->with('prices')->get(),
            'examinations' => SpecimenTypeExamination::where('active', true)->get(),
            'categories' => SpecimenCategory::where('active', true)->get(),
            'referrers' => Referrer::where('active', true)->get(),
            'referrerTypes' => ReferrerType::where('active', true)->get(),
            'locations' => Location::where('active', true)->get(),
            'sequences' => $sequences,
            'activeLocationId' => $activeLocationId,
            'products' => $products,
            'settings' => Setting::all()->pluck('setting_value', 'setting_key'),
            'pathologists' => $pathologists,
            'banks' => Bank::all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer' => 'required|exists:customers,id',
            'specimen_type' => 'required|exists:specimen_type,id',
            'specimen_type_examination' => 'required|exists:specimen_type_examination,id',
            'specimen_category' => 'required|exists:specimen_category,id',
            'referrer' => 'required|exists:referrers,id',
            'anatomic_site' => 'nullable|string|max:255',
            'diagnosis' => 'nullable|string',
            'clinical_notes' => 'nullable|string',
            'status' => 'required|string',
            'priority_id' => 'required|exists:priorities,id',
            'medical_order_file' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,gif',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $mime = $value->getMimeType();
                        $isImage = str_starts_with($mime, 'image/');
                        $sizeInKb = $value->getSize() / 1024;
                        if ($isImage) {
                            if ($sizeInKb > 10240) {
                                $fail('El archivo de imagen no debe superar los 10 MB.');
                            }
                        } else {
                            if ($sizeInKb > 30720) {
                                $fail('El archivo de orden médica no debe superar los 30 MB.');
                            }
                        }
                    }
                },
            ],
            'amount' => 'required|numeric|min:0',
            'discount' => 'required|numeric|min:0',
            'payment_type' => 'required|in:cash,credit card,bank transfer,check,credit',
            'has_initial_payment' => 'nullable|boolean',
            'initial_payment_amount' => 'required_if:has_initial_payment,true|nullable|numeric|min:0.01',
            'initial_payment_type' => 'required_if:has_initial_payment,true|nullable|in:cash,credit card,bank transfer,check',
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
            'proof_of_payment' => [
                (
                    $request->input('payment_type') === 'cash' ||
                    ($request->input('payment_type') === 'credit' && ! $request->boolean('has_initial_payment')) ||
                    ($request->input('payment_type') === 'credit' && $request->boolean('has_initial_payment') && $request->input('initial_payment_type') === 'cash')
                ) ? 'nullable' : 'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,gif',
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
            'insumos' => 'nullable|array',
            'insumos.*.id' => 'required|exists:products,id',
            'insumos.*.quantity' => 'required|integer|min:1',
            'insumos.*.price' => 'required|numeric|min:0',
        ]);

        $specimen = null;
        $invoice = null;
        $paymentInvoice = null;

        \Illuminate\Support\Facades\DB::transaction(function () use ($request, $validated, &$specimen, &$invoice, &$paymentInvoice) {
            $caiRange = CaiRange::where('status', 'active')->first();
            if (! $caiRange) {
                throw new \Exception('No hay un rango CAI activo configurado en el sistema.');
            }

            $sequence = Sequence::where('location_id', $caiRange->location_id)
                ->where('specimen_type', $validated['specimen_type'])
                ->where('active', true)
                ->lockForUpdate()
                ->first();

            if (! $sequence) {
                throw new \Exception('No hay una secuencia de numeración activa configurada para esta sucursal y tipo de muestra.');
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

            // Increment current sequence
            $sequence->increment('current_sequence');

            $specimenData = $validated;
            unset(
                $specimenData['amount'],
                $specimenData['discount'],
                $specimenData['payment_type'],
                $specimenData['proof_of_payment'],
                $specimenData['insumos'],
                $specimenData['has_initial_payment'],
                $specimenData['initial_payment_amount'],
                $specimenData['initial_payment_type'],
                $specimenData['payment_method_date'],
                $specimenData['cash_value'],
                $specimenData['check_number'],
                $specimenData['check_value'],
                $specimenData['card_last_4'],
                $specimenData['card_value_charged'],
                $specimenData['card_expiration'],
                $specimenData['card_authorization_code'],
                $specimenData['transfer_bank_id'],
                $specimenData['transfer_value'],
                $specimenData['transfer_authorization_code']
            );

            if ($request->hasFile('medical_order_file')) {
                $path = $this->storeUploadedFile($request->file('medical_order_file'), 'medical_orders');
                $specimenData['medical_order_file'] = $path;
            }

            $specimenData['sequence_code'] = $sequenceCode;
            $specimenData['access_token'] = Str::random(32);

            $specimen = Specimen::create($specimenData);

            if (! empty($validated['insumos'])) {
                foreach ($validated['insumos'] as $insumo) {
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

            $maxOrder = PrioritySpecimenOrder::where('priority_id', $validated['priority_id'])->max('order') ?? 0;
            PrioritySpecimenOrder::create([
                'priority_id' => $validated['priority_id'],
                'specimen_id' => $specimen->id,
                'order' => $maxOrder + 1,
            ]);

            $nextNumber = $caiRange->last_used_number + 1;
            $invoiceNumber = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
            $fullInvoiceNumber = $caiRange->full_prefix.$invoiceNumber;

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

            $insumosTotal = 0.00;
            if (! empty($validated['insumos'])) {
                foreach ($validated['insumos'] as $insumo) {
                    $insumosTotal += (float) $insumo['price'] * (int) $insumo['quantity'];
                }
            }

            $amount = (float) $validated['amount'];
            $discount = (float) $validated['discount'];
            $subtotal = $amount - $discount;

            if ($request->boolean('has_initial_payment') && (float) $validated['initial_payment_amount'] > $subtotal) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['El monto del pago inicial no puede superar el total de la factura (L. '.number_format($subtotal, 2).').'],
                ]);
            }

            $creditId = null;
            $initialPaymentAmount = 0.00;
            if ($validated['payment_type'] === 'credit') {
                $initialPaymentAmount = $request->boolean('has_initial_payment') ? (float) $validated['initial_payment_amount'] : 0.00;
                $credit = Credit::create([
                    'customer_id' => $specimen->customer,
                    'credit_amount' => $subtotal,
                    'amount_paid' => $initialPaymentAmount,
                    'amount_remaining' => $subtotal - $initialPaymentAmount,
                    'specimen_id' => $specimen->id,
                ]);
                $creditId = $credit->id;
            }

            $isCustomAmount = ! empty($validated['custom_amount_enabled']) && (float) ($validated['custom_amount'] ?? 0) > 0;
            $customAmountVal = $isCustomAmount ? (float) $validated['custom_amount'] : 0.00;
            $customAmountReasonVal = $isCustomAmount ? ($validated['custom_amount_reason'] ?? null) : null;

            $totalPaid = in_array($validated['payment_type'], ['cash', 'credit card', 'bank transfer', 'check']) ? $subtotal : $initialPaymentAmount;

            $invoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRange->id,
                'customer_id' => $specimen->customer,
                'specimen_id' => $specimen->id,
                'payment_type' => $validated['payment_type'],
                'credit_payment_id' => $creditId,
                'amount' => $amount,
                'discount' => $discount,
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
            ]);

            $caiRange->increment('last_used_number');
            if ($caiRange->last_used_number >= $caiRange->end_number) {
                $caiRange->update(['status' => 'exhausted']);
            }

            $invoice->load(['specimen.products', 'creditRelation']);
            $totalWords = $this->numberToSpanishWords($invoice->total);
            $customer = Customer::findOrFail($specimen->customer);
            $examination = SpecimenTypeExamination::findOrFail($specimen->specimen_type_examination);
            $location = Location::findOrFail($caiRange->location_id);

            $htmlContent = view('pdf.invoice', compact('invoice', 'caiRange', 'customer', 'examination', 'location', 'totalWords'))->render();

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
        });

        // Enviar notificación de WhatsApp al paciente
        try {
            $customer = Customer::find($specimen->customer);
            if ($customer) {
                $link = route('specimens.show-public', [
                    'specimen_code' => $specimen->sequence_code,
                    'token' => $specimen->access_token,
                ]);
                $patientName = $customer->name;
                $message = "Hola, {$patientName}. Su muestra con código {$specimen->sequence_code} ha sido registrada en Patolab. Puede ver el progreso de su análisis en el siguiente enlace: {$link}";

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

                Log::info('Mensaje enviado: '.$message);

            }
        } catch (\Exception $e) {
            Log::error('Error enviando notificación de WhatsApp: '.$e->getMessage());
        }

        $responseData = [
            'success' => 'Muestra y factura creadas con éxito.',
            'new_specimen_id' => $specimen->id,
            'new_invoice_id' => $invoice->id,

            'new_invoice_url' => asset('storage/'.$invoice->invoice_file),
        ];

        if ($paymentInvoice) {
            $responseData['new_payment_invoice_url'] = asset('storage/'.$paymentInvoice->invoice_file);
        }

        return redirect()->back()->with($responseData);
    }

    public function update(Request $request, Specimen $specimen)
    {
        $validated = $request->validate([
            'customer' => 'required|exists:customers,id',
            'specimen_type' => 'required|exists:specimen_type,id',
            'specimen_type_examination' => 'required|exists:specimen_type_examination,id',
            'specimen_category' => 'required|exists:specimen_category,id',
            'referrer' => 'required|exists:referrers,id',
            'anatomic_site' => 'nullable|string|max:255',
            'diagnosis' => 'nullable|string',
            'clinical_notes' => 'nullable|string',
            'status' => 'required|string',
            'priority_id' => 'required|exists:priorities,id',
            'medical_order_file' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,gif',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $mime = $value->getMimeType();
                        $isImage = str_starts_with($mime, 'image/');
                        $sizeInKb = $value->getSize() / 1024;
                        if ($isImage) {
                            if ($sizeInKb > 10240) {
                                $fail('El archivo de imagen no debe superar los 10 MB.');
                            }
                        } else {
                            if ($sizeInKb > 30720) {
                                $fail('El archivo de orden médica no debe superar los 30 MB.');
                            }
                        }
                    }
                },
            ],
        ]);

        if ($request->hasFile('medical_order_file')) {
            if ($specimen->medical_order_file) {
                Storage::disk('public')->delete($specimen->medical_order_file);
            }
            $path = $this->storeMedicalOrder($request->file('medical_order_file'));
            $validated['medical_order_file'] = $path;
        } else {
            unset($validated['medical_order_file']);
        }

        $oldPriorityId = $specimen->priority_id;

        $specimen->update($validated);

        if ($oldPriorityId != $validated['priority_id']) {
            PrioritySpecimenOrder::where('specimen_id', $specimen->id)
                ->where('priority_id', '!=', $validated['priority_id'])
                ->delete();

            $maxOrder = PrioritySpecimenOrder::where('priority_id', $validated['priority_id'])->max('order') ?? 0;
            PrioritySpecimenOrder::updateOrCreate(
                ['priority_id' => $validated['priority_id'], 'specimen_id' => $specimen->id],
                ['order' => $maxOrder + 1]
            );
        }

        return redirect()->back();
    }

    public function updateOrder(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:specimen,id',
            'items.*.priority_id' => 'required|integer|exists:priorities,id',
            'items.*.order' => 'required|integer',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                $specimen = Specimen::find($item['id']);
                if ($specimen && $specimen->priority_id != $item['priority_id']) {
                    $specimen->update(['priority_id' => $item['priority_id']]);
                }

                PrioritySpecimenOrder::where('specimen_id', $item['id'])
                    ->where('priority_id', '!=', $item['priority_id'])
                    ->delete();

                PrioritySpecimenOrder::updateOrCreate(
                    ['priority_id' => $item['priority_id'], 'specimen_id' => $item['id']],
                    ['order' => $item['order']]
                );
            }
        });

        return redirect()->back();
    }

    public function destroy(Specimen $specimen)
    {
        $specimen->update(['active' => false]);

        return redirect()->back();
    }

    /**
     * Optimiza y almacena una imagen de orden médica como JPG, o almacena un PDF directamente.
     */
    protected function storeMedicalOrder(UploadedFile $file): string
    {
        return app(ImageOptimizerService::class)->optimizeAndStore($file, 'medical_orders');
    }

    /**
     * Optimiza y almacena un archivo (imagen o PDF) en un directorio específico de storage/public.
     */
    protected function storeUploadedFile(UploadedFile $file, string $folder): string
    {
        return app(ImageOptimizerService::class)->optimizeAndStore($file, $folder);
    }

    /**
     * Convierte un valor numérico a su representación en palabras en español con centavos.
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

    /**
     * Registra un movimiento de inventario cuando se descuentan insumos de una muestra.
     */
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

    public function assignUser(Request $request, Specimen $specimen)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        if (! $specimen->users()->where('user_id', $validated['user_id'])->exists()) {
            $specimen->users()->attach($validated['user_id']);
        }

        return redirect()->back()->with('success', 'Patólogo asignado con éxito.');
    }

    public function unassignUser(Request $request, Specimen $specimen)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $specimen->users()->detach($validated['user_id']);

        return redirect()->back()->with('success', 'Patólogo desasignado con éxito.');
    }

    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:specimen,id',
            'action' => 'required|string|in:change_status,change_priority,assign_pathologist,unassign_pathologist,delete',
            'value' => 'nullable',
        ]);

        $ids = $validated['ids'];
        $action = $validated['action'];
        $value = $validated['value'] ?? null;

        \Illuminate\Support\Facades\DB::transaction(function () use ($ids, $action, $value) {
            if ($action === 'change_status') {
                Specimen::whereIn('id', $ids)->update(['status' => $value]);
            } elseif ($action === 'change_priority') {
                Specimen::whereIn('id', $ids)->update(['priority_id' => $value]);

                foreach ($ids as $id) {
                    PrioritySpecimenOrder::where('specimen_id', $id)
                        ->where('priority_id', '!=', $value)
                        ->delete();

                    $maxOrder = PrioritySpecimenOrder::where('priority_id', $value)->max('order') ?? 0;
                    PrioritySpecimenOrder::updateOrCreate(
                        ['priority_id' => $value, 'specimen_id' => $id],
                        ['order' => $maxOrder + 1]
                    );
                }
            } elseif ($action === 'assign_pathologist') {
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if ($specimen && ! $specimen->users()->where('user_id', $value)->exists()) {
                        $specimen->users()->attach($value);
                    }
                }
            } elseif ($action === 'unassign_pathologist') {
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if ($specimen) {
                        $specimen->users()->detach($value);
                    }
                }
            } elseif ($action === 'delete') {
                Specimen::whereIn('id', $ids)->update(['active' => false]);
            }
        });

        return redirect()->back()->with('success', 'Acción en bulk realizada con éxito.');
    }

    public function showPublic(Request $request, $specimen_code)
    {
        $token = $request->query('token');
        if (! $token) {
            $token = $request->input('token');
        }

        $specimen = Specimen::where('sequence_code', $specimen_code)
            ->where('access_token', $token)
            ->where('active', true)
            ->with(['customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'group'])
            ->first();

        if (! $specimen) {
            $exists = Specimen::where('sequence_code', $specimen_code)
                ->where('active', true)
                ->exists();
            if ($exists) {
                abort(403, 'Acceso no autorizado o token inválido.');
            }
            abort(404, 'Muestra no encontrada.');
        }

        return Inertia::render('specimens/public-progress', [
            'specimen' => $specimen,
        ]);
    }
}
