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
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use App\Services\ImageOptimizerService;
use App\Services\ReportPdfService;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Browsershot\Browsershot;

class SpecimenController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimens.view');
        $userId = auth()->id();

        // 1. Status Filter
        $statusCookie = $request->cookie("status_filter_specimens_user_{$userId}");
        $statuses = $request->get('status');
        if (! $request->has('status') && $statusCookie) {
            $statuses = json_decode($statusCookie, true);
        }
        $validStatuses = ['received', 'macroscopic_review', 'processing', 'microscopic_review', 'finalized', 'delivered', 'cancelled'];
        if (! $statuses || ! is_array($statuses)) {
            $statuses = ['received', 'macroscopic_review', 'processing', 'microscopic_review'];
        } else {
            $statuses = array_values(array_intersect($statuses, $validStatuses));
            if (empty($statuses)) {
                $statuses = ['received', 'macroscopic_review', 'processing', 'microscopic_review'];
            }
        }
        if ($request->has('status')) {
            cookie()->queue(cookie("status_filter_specimens_user_{$userId}", json_encode($statuses), 525600, null, null, null, false));
        }

        // 2. Specimen Type Filter
        $typeCookie = $request->cookie("specimen_type_filter_specimens_user_{$userId}");
        $specimenTypeId = $request->get('specimen_type_id', $typeCookie ?: 'all');
        if ($specimenTypeId !== 'all' && ! is_numeric($specimenTypeId)) {
            $specimenTypeId = 'all';
        }
        if ($request->has('specimen_type_id')) {
            cookie()->queue(cookie("specimen_type_filter_specimens_user_{$userId}", $specimenTypeId, 525600, null, null, null, false));
        }

        // 3. Examination Filter
        $examCookie = $request->cookie("examination_filter_specimens_user_{$userId}");
        $examinationId = $request->get('examination_id', $examCookie ?: 'all');
        if ($examinationId !== 'all' && ! is_numeric($examinationId)) {
            $examinationId = 'all';
        }
        if ($request->has('examination_id')) {
            cookie()->queue(cookie("examination_filter_specimens_user_{$userId}", $examinationId, 525600, null, null, null, false));
        }

        // 4. Date Range Filter
        $dateCookie = $request->cookie("date_filter_specimens_user_{$userId}");
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        if (! $request->has('date_from') && ! $request->has('date_to')) {
            if ($dateCookie) {
                $decoded = json_decode($dateCookie, true);
                if (is_array($decoded)) {
                    $dateFrom = $decoded['from'] ?? '';
                    $dateTo = $decoded['to'] ?? '';
                    if ($dateTo && $dateTo < now()->toDateString()) {
                        $dateTo = now()->toDateString();
                    }
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
            cookie()->queue(cookie("date_filter_specimens_user_{$userId}", json_encode(['from' => $dateFrom ?? '', 'to' => $dateTo ?? '']), 525600, null, null, null, false));
        }

        $priorities = Priority::orderBy('order', 'desc')->get();

        $priorities->load(['specimens' => function ($q) use ($statuses, $specimenTypeId, $examinationId, $dateFrom, $dateTo) {
            $q->where('specimen.active', true);

            // Filter by statuses
            if (! empty($statuses)) {
                $q->whereIn('specimen.status', $statuses);
            }

            // Filter by specimen type
            if ($specimenTypeId && $specimenTypeId !== 'all') {
                $q->where('specimen.specimen_type', $specimenTypeId);
            }

            // Filter by examination
            if ($examinationId && $examinationId !== 'all') {
                $q->where('specimen.specimen_type_examination', $examinationId);
            }

            // Filter by date range
            if (! empty($dateFrom)) {
                $q->whereDate('specimen.created_at', '>=', $dateFrom);
            }
            if (! empty($dateTo)) {
                $dateToEnd = Carbon::parse($dateTo)->addDays(1)->toDateString();
                $q->whereDate('specimen.created_at', '<=', $dateToEnd);
            }

            $q->with(['customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'invoiceRelation.creditRelation', 'invoiceRelation.transferBank', 'users', 'collaborators', 'group.invoice.creditRelation', 'group.invoice.transferBank', 'report', 'cancelledBy'])
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
            $assistantRole = Role::where('slug', 'assistant_pathologist')->first();
            $roleIds = array_filter([$pathologistRoleId, $assistantRole?->id]);
            $pathologists = User::where('active', true)->whereIn('role_id', $roleIds)->get();
        }

        return Inertia::render('specimens/index', [
            'priorities' => $priorities,
            'specimenTypes' => SpecimenType::where('active', true)->get(),
            'examinations' => SpecimenTypeExamination::where('active', true)->with('prices')->get(),
            'categories' => SpecimenCategory::where('active', true)->get(),
            'referrers' => Referrer::where('active', true)->get(),
            'referrerTypes' => ReferrerType::where('active', true)->get(),
            'locations' => Location::where('active', true)->get(),
            'sequences' => $sequences,
            'activeLocationId' => $activeLocationId,
            'products' => $products,
            'settings' => Setting::all()->pluck('setting_value', 'setting_key'),
            'pathologists' => $pathologists,
            'usersList' => User::where('active', true)->orderBy('name')->get(),
            'banks' => Bank::all(),
            'filters' => [
                'status' => $statuses,
                'specimen_type_id' => $specimenTypeId,
                'examination_id' => $examinationId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimens.create');
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
            'quantity' => 'required|integer|min:1',
            'amount' => 'required|numeric|min:0',
            'discount' => 'required|numeric|min:0',
            'payment_type' => 'required|in:cash,credit card,bank transfer,check,credit',
            'has_initial_payment' => $request->input('payment_type') === 'credit' ? 'nullable|boolean' : 'nullable',
            'initial_payment_amount' => $request->input('payment_type') === 'credit' ? 'required_if:has_initial_payment,true|nullable|numeric|min:0.01' : 'nullable',
            'initial_payment_type' => $request->input('payment_type') === 'credit' ? 'required_if:has_initial_payment,true|nullable|in:cash,credit card,bank transfer,check' : 'nullable',
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
                $specimenData['quantity'],
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
            $specimenData['location_id'] = $caiRange->location_id;
            $specimenData['access_token'] = Str::random(32);
            $specimenData['delivery_token'] = Str::random(32);

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

            $qty = (int) ($validated['quantity'] ?? 1);
            $basePriceTotal = $amount - $customAmountVal;
            $unitPrice = $qty > 0 ? ($basePriceTotal / $qty) : $basePriceTotal;

            $invoice = Invoice::create([
                'full_invoice_number' => $fullInvoiceNumber,
                'invoice_number' => $invoiceNumber,
                'cai_range_id' => $caiRange->id,
                'customer_id' => $specimen->customer,
                'specimen_id' => $specimen->id,
                'payment_type' => $validated['payment_type'],
                'credit_payment_id' => $creditId,
                'quantity' => $qty,
                'amount' => $unitPrice,
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

            try {
                $invoice->load(['specimen.products', 'creditRelation', 'specimen.type']);
                $totalWords = $this->numberToSpanishWords($invoice->total);
                $customer = Customer::findOrFail($specimen->customer);
                $examination = SpecimenTypeExamination::findOrFail($specimen->specimen_type_examination);
                $location = Location::findOrFail($caiRange->location_id);

                $htmlContent = view('pdf.invoice', compact('invoice', 'caiRange', 'customer', 'examination', 'location', 'totalWords'))->render();

                $filename = 'invoice_'.$invoice->id.'_'.time().'.pdf';
                $pdfPath = 'invoices/'.$filename;

                $browsershot = Browsershot::html($htmlContent);

                if (app()->environment('production')) {
                    $browsershot->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                        ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                        ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                        ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'));
                } elseif (env('PUPPETEER_EXECUTABLE_PATH')) {
                    $browsershot->setChromePath(env('PUPPETEER_EXECUTABLE_PATH'));
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
            } catch (\Throwable $e) {
                Log::warning('Error generating specimen invoice PDF: '.$e->getMessage());
            }
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
        Gate::authorize('specimens.edit');
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
            'payment_type' => 'nullable|in:cash,credit card,bank transfer,check,credit',
            'has_initial_payment' => $request->input('payment_type') === 'credit' ? 'nullable|boolean' : 'nullable',
            'initial_payment_amount' => $request->input('payment_type') === 'credit' ? 'required_if:has_initial_payment,true|nullable|numeric|min:0.01' : 'nullable',
            'initial_payment_type' => $request->input('payment_type') === 'credit' ? 'required_if:has_initial_payment,true|nullable|in:cash,credit card,bank transfer,check' : 'nullable',
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
            'regenerate_pdf' => 'nullable|boolean',
        ]);

        $invoice = $specimen->is_group && $specimen->group
            ? $specimen->group->invoice
            : $specimen->invoiceRelation;

        if ($invoice) {
            $oldPaymentType = $invoice->payment_type;
            $newPaymentType = $request->input('payment_type');

            if ($oldPaymentType === 'credit' && in_array($newPaymentType, ['credit card', 'bank transfer', 'check'])) {
                if (! $request->hasFile('proof_of_payment')) {
                    throw ValidationException::withMessages([
                        'proof_of_payment' => ['El archivo de comprobante de pago es requerido al cambiar de crédito.'],
                    ]);
                }
            }
        }

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

        \Illuminate\Support\Facades\DB::transaction(function () use ($specimen, &$validated, $oldPriorityId, $request) {
            $oldSpecimenType = (int) $specimen->specimen_type;
            $newSpecimenType = (int) $validated['specimen_type'];

            if ($oldSpecimenType !== $newSpecimenType) {
                $locationId = $specimen->location_id;
                if (! $locationId) {
                    if ($specimen->invoiceRelation && $specimen->invoiceRelation->caiRange) {
                        $locationId = $specimen->invoiceRelation->caiRange->location_id;
                    } else {
                        $caiRange = CaiRange::where('status', 'active')->first();
                        $locationId = $caiRange ? $caiRange->location_id : null;
                    }
                }

                if ($locationId) {
                    $sequence = Sequence::where('location_id', $locationId)
                        ->where('specimen_type', $newSpecimenType)
                        ->where('active', true)
                        ->lockForUpdate()
                        ->first();

                    if (! $sequence) {
                        throw new \Exception('No hay una secuencia de numeración activa configurada para esta sucursal y tipo de muestra.');
                    }

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

                    $validated['sequence_code'] = $sequenceCode;
                    $validated['location_id'] = $locationId;
                }
            }

            $oldSpecimenExam = (int) $specimen->specimen_type_examination;
            $newSpecimenExam = (int) $validated['specimen_type_examination'];

            if ($specimen->report_id && ($oldSpecimenType !== $newSpecimenType || $oldSpecimenExam !== $newSpecimenExam)) {
                $request->validate([
                    'template_id' => 'required|exists:specimen_type_templates,id',
                ]);

                $template = SpecimenTypeTemplate::where('id', $request->template_id)
                    ->where('specimen_type_id', $newSpecimenType)
                    ->where('specimen_type_examination_id', $newSpecimenExam)
                    ->where(function ($query) {
                        $query->where('user_id', auth()->id())
                            ->orWhereExists(function ($q) {
                                $q->select(\Illuminate\Support\Facades\DB::raw(1))
                                    ->from('user_templates_permissions')
                                    ->whereColumn('user_templates_permissions.template_id', 'specimen_type_templates.id')
                                    ->where('user_templates_permissions.shared_with_id', auth()->id());
                            });
                    })
                    ->first();

                if (! $template) {
                    throw ValidationException::withMessages([
                        'template_id' => ['La plantilla seleccionada no es válida o no tienes permisos para usarla.'],
                    ]);
                }

                $report = SpecimenReport::find($specimen->report_id);
                if ($report) {
                    $report->update([
                        'macroscopy_html' => $template->macroscopy_html ?? '',
                        'microscopy_html' => $template->microscopy_html ?? '',
                        'diagnosis_html' => $template->diagnosis_html ?? '',
                        'clinical_details_html' => $template->clinical_details_html ?? '',
                        'comments_notes_html' => $template->comments_notes_html ?? '',
                        'protocols_html' => $template->protocols_html ?? '',
                        'legend_html' => $template->legend_html ?? '',
                        'sections_order' => $template->sections_order ?? null,
                        'headings_toggles' => $template->headings_toggles ?? null,
                    ]);

                    \Illuminate\Support\Facades\DB::table('specimen_reports')->where('id', $report->id)->update([
                        'yjs_macroscopy_state' => null,
                        'yjs_microscopy_state' => null,
                        'yjs_diagnosis_state' => null,
                        'yjs_report_date_state' => null,
                        'yjs_clinical_details_state' => null,
                        'yjs_comments_notes_state' => null,
                        'yjs_protocols_state' => null,
                        'yjs_legend_state' => null,
                    ]);
                }
            }

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

            // Payment type logic
            $invoice = $specimen->is_group && $specimen->group
                ? $specimen->group->invoice
                : $specimen->invoiceRelation;

            if ($invoice && $request->filled('payment_type')) {
                $newPaymentType = $request->input('payment_type');
                $oldPaymentType = $invoice->payment_type;

                if ($newPaymentType !== $oldPaymentType) {
                    if ($oldPaymentType === 'credit') {
                        $credit = $invoice->creditRelation;
                        if ($credit) {
                            $hasPayments = $credit->invoices()->where('invoice_type', 'credit payment')->exists();
                            if ($hasPayments) {
                                throw ValidationException::withMessages([
                                    'payment_type' => ['No se puede cambiar el método de pago porque el crédito ya tiene pagos registrados.'],
                                ]);
                            }
                            $credit->delete();
                        }
                    }
                }

                // File upload for proof of payment
                $proofOfPaymentPath = $invoice->proof_of_payment;
                if ($request->hasFile('proof_of_payment')) {
                    if ($proofOfPaymentPath && $proofOfPaymentPath !== 'Efectivo' && Storage::disk('public')->exists($proofOfPaymentPath)) {
                        Storage::disk('public')->delete($proofOfPaymentPath);
                    }
                    $proofOfPaymentPath = $this->storeUploadedFile($request->file('proof_of_payment'), 'proofs');
                } elseif ($newPaymentType === 'cash') {
                    $proofOfPaymentPath = 'Efectivo';
                }

                if ($newPaymentType === 'credit') {
                    $initialPaymentAmount = $request->boolean('has_initial_payment') ? (float) $request->input('initial_payment_amount') : 0.00;

                    // Create or update credit
                    $credit = $invoice->creditRelation;
                    if ($credit) {
                        $credit->update([
                            'customer_id' => $validated['customer'],
                            'credit_amount' => $invoice->total,
                            'amount_paid' => $initialPaymentAmount,
                            'amount_remaining' => $invoice->total - $initialPaymentAmount,
                        ]);
                    } else {
                        $credit = Credit::create([
                            'customer_id' => $validated['customer'],
                            'credit_amount' => $invoice->total,
                            'amount_paid' => $initialPaymentAmount,
                            'amount_remaining' => $invoice->total - $initialPaymentAmount,
                            'specimen_id' => $specimen->id,
                            'is_group' => $specimen->is_group,
                            'group_id' => $specimen->group_id,
                        ]);
                    }

                    $invoice->update([
                        'payment_type' => 'credit',
                        'credit_payment_id' => $credit->id,
                        'total_paid' => $initialPaymentAmount,
                        'proof_of_payment' => $proofOfPaymentPath,
                        'payment_method_date' => $request->input('payment_method_date'),
                        'cash_value' => $request->input('initial_payment_type') === 'cash' ? $initialPaymentAmount : null,
                        'check_number' => $request->input('initial_payment_type') === 'check' ? $request->input('check_number') : null,
                        'check_value' => $request->input('initial_payment_type') === 'check' ? $initialPaymentAmount : null,
                        'card_last_4' => $request->input('initial_payment_type') === 'credit card' ? $request->input('card_last_4') : null,
                        'card_value_charged' => $request->input('initial_payment_type') === 'credit card' ? $initialPaymentAmount : null,
                        'card_expiration' => $request->input('initial_payment_type') === 'credit card' ? $request->input('card_expiration') : null,
                        'card_authorization_code' => $request->input('initial_payment_type') === 'credit card' ? $request->input('card_authorization_code') : null,
                        'transfer_bank_id' => $request->input('initial_payment_type') === 'bank transfer' ? $request->input('transfer_bank_id') : null,
                        'transfer_value' => $request->input('initial_payment_type') === 'bank transfer' ? $initialPaymentAmount : null,
                        'transfer_authorization_code' => $request->input('initial_payment_type') === 'bank transfer' ? $request->input('transfer_authorization_code') : null,
                    ]);
                } else {
                    $invoice->update([
                        'payment_type' => $newPaymentType,
                        'credit_payment_id' => null,
                        'total_paid' => $invoice->total,
                        'proof_of_payment' => $proofOfPaymentPath,
                        'payment_method_date' => $request->input('payment_method_date'),
                        'cash_value' => $newPaymentType === 'cash' ? $invoice->total : null,
                        'check_number' => $newPaymentType === 'check' ? $request->input('check_number') : null,
                        'check_value' => $newPaymentType === 'check' ? $invoice->total : null,
                        'card_last_4' => $newPaymentType === 'credit card' ? $request->input('card_last_4') : null,
                        'card_value_charged' => $newPaymentType === 'credit card' ? $invoice->total : null,
                        'card_expiration' => $newPaymentType === 'credit card' ? $request->input('card_expiration') : null,
                        'card_authorization_code' => $newPaymentType === 'credit card' ? $request->input('card_authorization_code') : null,
                        'transfer_bank_id' => $newPaymentType === 'bank transfer' ? $request->input('transfer_bank_id') : null,
                        'transfer_value' => $newPaymentType === 'bank transfer' ? $invoice->total : null,
                        'transfer_authorization_code' => $newPaymentType === 'bank transfer' ? $request->input('transfer_authorization_code') : null,
                    ]);
                }
            }

            // Sync invoice customer to match specimen's customer
            if ($invoice && ! $specimen->is_group && $invoice->customer_id != $validated['customer']) {
                $invoice->update(['customer_id' => $validated['customer']]);
            }
        });

        $invoice = $specimen->is_group && $specimen->group
            ? $specimen->group->invoice
            : $specimen->invoiceRelation;

        if ($request->boolean('regenerate_pdf', true) && $invoice) {
            try {
                $invoice->load(['specimen.products', 'specimen.examination.prices', 'creditRelation', 'customer', 'caiRange', 'groupSpecimens.specimen.examination', 'groupSpecimens.specimen.customerRelation', 'groupSpecimens.specimen.examination.prices', 'groupSpecimens.specimen.products']);
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

        return redirect()->back();
    }

    public function updateOrder(Request $request)
    {
        Gate::authorize('specimens.edit');
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
        Gate::authorize('specimens.delete');
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
        Gate::authorize('specimens.manage');
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'macroscopy_access' => 'nullable|boolean',
            'microscopy_access' => 'nullable|boolean',
        ]);

        $macroscopy = $request->boolean('macroscopy_access', false);
        $microscopy = $request->boolean('microscopy_access', false);

        if ($specimen->users()->where('user_id', $validated['user_id'])->exists()) {
            $specimen->users()->updateExistingPivot($validated['user_id'], [
                'macroscopy_access' => $macroscopy,
                'microscopy_access' => $microscopy,
            ]);
        } else {
            $specimen->users()->attach($validated['user_id'], [
                'macroscopy_access' => $macroscopy,
                'microscopy_access' => $microscopy,
            ]);
        }

        return redirect()->back()->with('success', 'Patólogo asignado con éxito.');
    }

    public function unassignUser(Request $request, Specimen $specimen)
    {
        Gate::authorize('specimens.manage');
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $specimen->users()->detach($validated['user_id']);

        return redirect()->back()->with('success', 'Patólogo desasignado con éxito.');
    }

    public function assignCollaborator(Request $request, Specimen $specimen)
    {
        $isAssigned = $specimen->users()->where('user_id', auth()->id())->exists();
        if (! Gate::allows('specimens.manage') && ! $isAssigned) {
            abort(403, 'No tienes permiso para gestionar colaboradores en esta muestra.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'macroscopy_access' => 'nullable|boolean',
            'microscopy_access' => 'nullable|boolean',
        ]);

        $macroscopy = $request->boolean('macroscopy_access', false);
        $microscopy = $request->boolean('microscopy_access', false);

        if ($specimen->collaborators()->where('user_id', $validated['user_id'])->exists()) {
            $specimen->collaborators()->updateExistingPivot($validated['user_id'], [
                'macroscopy_access' => $macroscopy,
                'microscopy_access' => $microscopy,
            ]);
        } else {
            $specimen->collaborators()->attach($validated['user_id'], [
                'macroscopy_access' => $macroscopy,
                'microscopy_access' => $microscopy,
            ]);
        }

        return redirect()->back()->with('success', 'Colaborador asignado con éxito.');
    }

    public function unassignCollaborator(Request $request, Specimen $specimen)
    {
        $isAssigned = $specimen->users()->where('user_id', auth()->id())->exists();
        if (! Gate::allows('specimens.manage') && ! $isAssigned) {
            abort(403, 'No tienes permiso para gestionar colaboradores en esta muestra.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $specimen->collaborators()->detach($validated['user_id']);

        return redirect()->back()->with('success', 'Colaborador desasignado con éxito.');
    }

    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:specimen,id',
            'action' => 'required|string|in:change_status,change_priority,assign_pathologist,unassign_pathologist,delete,assign_collaborator,unassign_collaborator',
            'value' => 'nullable',
            'cancellation_reason' => 'nullable|string',
        ]);

        if ($request->input('action') === 'change_status' && $request->input('value') === 'cancelled') {
            $request->validate([
                'cancellation_reason' => 'required|string',
            ], [
                'cancellation_reason.required' => 'El motivo de cancelación es obligatorio.',
            ]);
        }

        $ids = $validated['ids'];
        $action = $validated['action'];
        $value = $validated['value'] ?? null;
        $cancellationReason = $validated['cancellation_reason'] ?? null;

        if (in_array($action, ['change_status', 'change_priority'])) {
            Gate::authorize('specimens.edit');
        } elseif (in_array($action, ['assign_pathologist', 'unassign_pathologist'])) {
            Gate::authorize('specimens.manage');
        } elseif (in_array($action, ['assign_collaborator', 'unassign_collaborator'])) {
            $isAssignedToAll = true;
            if (! Gate::allows('specimens.manage')) {
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if (! $specimen || ! $specimen->users()->where('user_id', auth()->id())->exists()) {
                        $isAssignedToAll = false;
                        break;
                    }
                }
            }
            if (! Gate::allows('specimens.manage') && ! $isAssignedToAll) {
                abort(403, 'No tienes permiso para gestionar colaboradores en estas muestras.');
            }
        } elseif ($action === 'delete') {
            Gate::authorize('specimens.delete');
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($ids, $action, $value, $cancellationReason) {
            if ($action === 'change_status') {
                $updateData = ['status' => $value];
                $allIds = $ids;
                if ($value === 'cancelled') {
                    $updateData['cancellation_reason'] = $cancellationReason;
                    $updateData['cancelled_at'] = now();
                    $updateData['cancelled_by_id'] = auth()->id();

                    $resolvedIds = collect($ids);
                    foreach ($ids as $id) {
                        $spec = Specimen::find($id);
                        if ($spec && $spec->is_group && $spec->group_id) {
                            $groupSpecimenIds = Specimen::where('group_id', $spec->group_id)->pluck('id')->toArray();
                            $resolvedIds = $resolvedIds->merge($groupSpecimenIds);
                        }
                    }
                    $allIds = $resolvedIds->unique()->toArray();

                    foreach ($allIds as $id) {
                        $specimen = Specimen::find($id);
                        if ($specimen) {
                            $invoice = $specimen->invoiceRelation;
                            if (! $invoice && $specimen->is_group && $specimen->group) {
                                $invoice = $specimen->group->invoice;
                            }

                            if ($invoice) {
                                $invoice->update([
                                    'quantity' => 0,
                                    'amount' => 0.00,
                                    'discount' => 0.00,
                                    'subtotal' => 0.00,
                                    'exempt_amount' => 0.00,
                                    'tax_exempt_amount' => 0.00,
                                    'taxable_amount_15' => 0.00,
                                    'taxable_amount_18' => 0.00,
                                    'isv_15' => 0.00,
                                    'isv_18' => 0.00,
                                    'total' => 0.00,
                                    'total_paid' => 0.00,
                                    'cash_value' => 0.00,
                                    'check_value' => 0.00,
                                    'card_value_charged' => 0.00,
                                    'transfer_value' => 0.00,
                                    'invoice_type' => 'cancelled',
                                    'credit_payment_id' => null,
                                ]);
                            }

                            $credit = Credit::where('specimen_id', $specimen->id)->first();
                            if (! $credit && $specimen->is_group && $specimen->group_id) {
                                $credit = Credit::where('group_id', $specimen->group_id)->first();
                            }

                            if ($credit) {
                                $credit->delete();
                            }
                        }
                    }
                }
                Specimen::whereIn('id', $allIds)->update($updateData);
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
                $macroscopy = request()->boolean('macroscopy_access', true);
                $microscopy = request()->boolean('microscopy_access', true);
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if ($specimen) {
                        if ($specimen->users()->where('user_id', $value)->exists()) {
                            $specimen->users()->updateExistingPivot($value, [
                                'macroscopy_access' => $macroscopy,
                                'microscopy_access' => $microscopy,
                            ]);
                        } else {
                            $specimen->users()->attach($value, [
                                'macroscopy_access' => $macroscopy,
                                'microscopy_access' => $microscopy,
                            ]);
                        }
                    }
                }
            } elseif ($action === 'unassign_pathologist') {
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if ($specimen) {
                        $specimen->users()->detach($value);
                    }
                }
            } elseif ($action === 'assign_collaborator') {
                $macroscopy = request()->boolean('macroscopy_access', false);
                $microscopy = request()->boolean('microscopy_access', false);
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if ($specimen) {
                        if ($specimen->collaborators()->where('user_id', $value)->exists()) {
                            $specimen->collaborators()->updateExistingPivot($value, [
                                'macroscopy_access' => $macroscopy,
                                'microscopy_access' => $microscopy,
                            ]);
                        } else {
                            $specimen->collaborators()->attach($value, [
                                'macroscopy_access' => $macroscopy,
                                'microscopy_access' => $microscopy,
                            ]);
                        }
                    }
                }
            } elseif ($action === 'unassign_collaborator') {
                foreach ($ids as $id) {
                    $specimen = Specimen::find($id);
                    if ($specimen) {
                        $specimen->collaborators()->detach($value);
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

        $justDelivered = false;
        $deliveryToken = $request->query('delivery_token') ?? $request->input('delivery_token');
        if ($deliveryToken && $specimen->delivery_token === $deliveryToken) {
            if ($specimen->status === 'finalized') {
                $specimen->update(['status' => 'delivered']);
                $specimen->refresh();
                $justDelivered = true;
            }
        }

        return Inertia::render('specimens/public-progress', [
            'specimen' => $specimen,
            'just_delivered' => $justDelivered,
        ]);
    }

    public function show(Specimen $specimen)
    {
        Gate::authorize('specimens.view');

        $specimen->load([
            'customerRelation',
            'type',
            'examination',
            'category',
            'referrerRelation',
            'priority',
            'invoiceRelation.creditRelation',
            'invoiceRelation.transferBank',
            'invoiceRelation.caiRange',
            'users',
            'collaborators',
            'group.invoice.creditRelation',
            'group.invoice.transferBank',
            'group.invoice.caiRange',
            'group.specimens',
            'report',
            'workOrders.task',
            'workOrders.users',
            'cancelledBy',
        ]);

        return response()->json($specimen);
    }

    public function generateReport(Specimen $specimen)
    {
        Gate::authorize('specimens.edit');

        if (! $specimen->report) {
            return redirect()->back()->with('error', 'No hay reporte asociado a esta muestra.');
        }

        try {
            app(ReportPdfService::class)->generateAndStoreReport($specimen);

            return redirect()->back()->with('success', 'Reporte generado con éxito.');
        } catch (\Exception $e) {
            Log::error('Error generating report: '.$e->getMessage());

            return redirect()->back()->with('error', 'Error al generar el reporte: '.$e->getMessage());
        }
    }
}
