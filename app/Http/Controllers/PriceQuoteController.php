<?php

namespace App\Http\Controllers;

use App\Mail\PriceQuoteMail;
use App\Models\PriceQuote;
use App\Models\PriceQuoteSpecimen;
use App\Services\PriceQuotePdfService;
use App\Services\ResendService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PriceQuoteController extends Controller
{
    /**
     * Display a listing of price quotes.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('price_quotes.view');

        $query = PriceQuote::query()
            ->where('active', true)
            ->with([
                'customer',
                'priceQuoteSpecimens.specimenType',
                'priceQuoteSpecimens.specimenCategory',
                'priceQuoteSpecimens.examination.prices',
            ]);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('price_quote_id', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('specimen_type') && $request->input('specimen_type') !== 'all') {
            $query->whereHas('priceQuoteSpecimens', function ($sq) use ($request) {
                $sq->where('specimen_type', $request->input('specimen_type'));
            });
        }

        if ($request->filled('specimen_category') && $request->input('specimen_category') !== 'all') {
            $query->whereHas('priceQuoteSpecimens', function ($sq) use ($request) {
                $sq->where('specimen_category', $request->input('specimen_category'));
            });
        }

        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        $allowedSorts = ['created_at', 'price_quote_id', 'customer_id'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest();
        }

        $priceQuotes = $query->paginate(15)->withQueryString();

        return Inertia::render('price-quotes/index', [
            'priceQuotes' => $priceQuotes,
            'filters' => $request->only(['search', 'specimen_type', 'specimen_category', 'sort_field', 'sort_direction']),
        ]);
    }

    /**
     * Store a newly created price quote in storage.
     */
    public function store(Request $request, PriceQuotePdfService $pdfService): RedirectResponse
    {
        Gate::authorize('price_quotes.create');

        $this->normalizeSpecimensInput($request);

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'specimens' => 'required|array|min:1',
            'specimens.*.specimen' => 'nullable|string|max:50',
            'specimens.*.specimen_type' => 'required|integer',
            'specimens.*.specimen_category' => 'required|integer',
            'specimens.*.examination_id' => 'required',
            'specimens.*.quantity' => 'required|integer|min:1',
            'specimens.*.amount' => 'nullable|numeric',
            'specimens.*.discount' => 'nullable|numeric',
            'specimens.*.subtotal' => 'nullable|numeric',
            'specimens.*.exempt_amount' => 'nullable|numeric',
            'specimens.*.taxable_amount_15' => 'nullable|numeric',
            'specimens.*.taxable_amount_18' => 'nullable|numeric',
            'specimens.*.isv_15' => 'nullable|numeric',
            'specimens.*.isv_18' => 'nullable|numeric',
            'specimens.*.total' => 'nullable|numeric',
            'specimens.*.selected_price' => 'nullable',
            'specimens.*.custom_specimen_price' => 'nullable|numeric',
            'specimens.*.additional_discount_enabled' => 'nullable|boolean',
            'specimens.*.additional_discount' => 'nullable|numeric',
            'specimens.*.age_discout_type' => 'nullable|string',
            'specimens.*.age_discout_amount' => 'nullable|numeric',
        ]);

        $priceQuote = DB::transaction(function () use ($validated) {
            $hexCode = strtoupper(substr(bin2hex(random_bytes(6)), 0, 12));
            while (PriceQuote::where('price_quote_id', $hexCode)->exists()) {
                $hexCode = strtoupper(substr(bin2hex(random_bytes(6)), 0, 12));
            }

            $priceQuote = PriceQuote::create([
                'price_quote_id' => $hexCode,
                'customer_id' => $validated['customer_id'] ?? null,
                'active' => true,
            ]);

            // Map each unique temporary frontend specimen code to a real 12-hex code
            $specimenCodeMap = [];
            foreach ($validated['specimens'] as $item) {
                $tempCode = $item['specimen'] ?? 'temp_'.bin2hex(random_bytes(3));
                if (! isset($specimenCodeMap[$tempCode])) {
                    $realHex = substr(bin2hex(random_bytes(6)), 0, 12);
                    while (PriceQuoteSpecimen::where('specimen', $realHex)->exists()) {
                        $realHex = substr(bin2hex(random_bytes(6)), 0, 12);
                    }
                    $specimenCodeMap[$tempCode] = $realHex;
                }
            }

            foreach ($validated['specimens'] as $item) {
                $tempCode = $item['specimen'] ?? 'temp_default';
                $realCode = $specimenCodeMap[$tempCode] ?? substr(bin2hex(random_bytes(6)), 0, 12);

                PriceQuoteSpecimen::create([
                    'price_quote_id' => $priceQuote->id,
                    'specimen' => $realCode,
                    'specimen_type' => $item['specimen_type'],
                    'specimen_category' => $item['specimen_category'],
                    'examination_id' => $item['examination_id'],
                    'quantity' => $item['quantity'] ?? 1,
                    'amount' => $item['amount'] ?? 0,
                    'discount' => $item['discount'] ?? 0,
                    'subtotal' => $item['subtotal'] ?? 0,
                    'exempt_amount' => $item['exempt_amount'] ?? 0,
                    'taxable_amount_15' => $item['taxable_amount_15'] ?? 0,
                    'taxable_amount_18' => $item['taxable_amount_18'] ?? 0,
                    'isv_15' => $item['isv_15'] ?? 0,
                    'isv_18' => $item['isv_18'] ?? 0,
                    'total' => $item['total'] ?? 0,
                    'selected_price' => $item['selected_price'] ?? 0,
                    'custom_specimen_price' => $item['custom_specimen_price'] ?? 0,
                    'additional_discount_enabled' => $item['additional_discount_enabled'] ?? false,
                    'additional_discount' => $item['additional_discount'] ?? 0,
                    'age_discout_type' => $item['age_discout_type'] ?? 'percentage',
                    'age_discout_amount' => $item['age_discout_amount'] ?? 0,
                ]);
            }

            return $priceQuote;
        });

        $pdfService->generateAndStorePriceQuote($priceQuote);

        return redirect()->back()->with([
            'success' => 'Cotización creada exitosamente.',
            'new_price_quote_url' => $priceQuote->fresh()->price_quote_url,
        ]);
    }

    /**
     * Update the specified price quote in storage.
     */
    public function update(Request $request, PriceQuote $priceQuote, PriceQuotePdfService $pdfService): RedirectResponse
    {
        Gate::authorize('price_quotes.edit');

        $this->normalizeSpecimensInput($request);

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'specimens' => 'required|array|min:1',
            'specimens.*.specimen' => 'nullable|string|max:50',
            'specimens.*.specimen_type' => 'required|integer',
            'specimens.*.specimen_category' => 'required|integer',
            'specimens.*.examination_id' => 'required',
            'specimens.*.quantity' => 'required|integer|min:1',
            'specimens.*.amount' => 'nullable|numeric',
            'specimens.*.discount' => 'nullable|numeric',
            'specimens.*.subtotal' => 'nullable|numeric',
            'specimens.*.exempt_amount' => 'nullable|numeric',
            'specimens.*.taxable_amount_15' => 'nullable|numeric',
            'specimens.*.taxable_amount_18' => 'nullable|numeric',
            'specimens.*.isv_15' => 'nullable|numeric',
            'specimens.*.isv_18' => 'nullable|numeric',
            'specimens.*.total' => 'nullable|numeric',
            'specimens.*.selected_price' => 'nullable',
            'specimens.*.custom_specimen_price' => 'nullable|numeric',
            'specimens.*.additional_discount_enabled' => 'nullable|boolean',
            'specimens.*.additional_discount' => 'nullable|numeric',
            'specimens.*.age_discout_type' => 'nullable|string',
            'specimens.*.age_discout_amount' => 'nullable|numeric',
        ]);

        DB::transaction(function () use ($priceQuote, $validated) {
            $priceQuote->update([
                'customer_id' => $validated['customer_id'] ?? null,
            ]);

            // Replace specimens with new list
            $priceQuote->priceQuoteSpecimens()->delete();

            // Map each unique temporary frontend specimen code to a real 12-hex code, preserving existing valid hex codes
            $specimenCodeMap = [];
            foreach ($validated['specimens'] as $item) {
                $code = $item['specimen'] ?? 'temp_'.bin2hex(random_bytes(3));
                if (! isset($specimenCodeMap[$code])) {
                    if (preg_match('/^[0-9a-fA-F]{12}$/', $code)) {
                        $specimenCodeMap[$code] = strtolower($code);
                    } else {
                        $realHex = substr(bin2hex(random_bytes(6)), 0, 12);
                        while (PriceQuoteSpecimen::where('specimen', $realHex)->exists()) {
                            $realHex = substr(bin2hex(random_bytes(6)), 0, 12);
                        }
                        $specimenCodeMap[$code] = $realHex;
                    }
                }
            }

            foreach ($validated['specimens'] as $item) {
                $code = $item['specimen'] ?? 'temp_default';
                $realCode = $specimenCodeMap[$code] ?? substr(bin2hex(random_bytes(6)), 0, 12);

                PriceQuoteSpecimen::create([
                    'price_quote_id' => $priceQuote->id,
                    'specimen' => $realCode,
                    'specimen_type' => $item['specimen_type'],
                    'specimen_category' => $item['specimen_category'],
                    'examination_id' => $item['examination_id'],
                    'quantity' => $item['quantity'] ?? 1,
                    'amount' => $item['amount'] ?? 0,
                    'discount' => $item['discount'] ?? 0,
                    'subtotal' => $item['subtotal'] ?? 0,
                    'exempt_amount' => $item['exempt_amount'] ?? 0,
                    'taxable_amount_15' => $item['taxable_amount_15'] ?? 0,
                    'taxable_amount_18' => $item['taxable_amount_18'] ?? 0,
                    'isv_15' => $item['isv_15'] ?? 0,
                    'isv_18' => $item['isv_18'] ?? 0,
                    'total' => $item['total'] ?? 0,
                    'selected_price' => $item['selected_price'] ?? 0,
                    'custom_specimen_price' => $item['custom_specimen_price'] ?? 0,
                    'additional_discount_enabled' => $item['additional_discount_enabled'] ?? false,
                    'additional_discount' => $item['additional_discount'] ?? 0,
                    'age_discout_type' => $item['age_discout_type'] ?? 'percentage',
                    'age_discout_amount' => $item['age_discout_amount'] ?? 0,
                ]);
            }
        });

        $pdfService->generateAndStorePriceQuote($priceQuote);

        return redirect()->back()->with([
            'success' => 'Cotización actualizada exitosamente.',
            'new_price_quote_url' => $priceQuote->fresh()->price_quote_url,
        ]);
    }

    /**
     * Remove the specified price quote from storage (soft delete).
     */
    public function destroy(PriceQuote $priceQuote): RedirectResponse
    {
        Gate::authorize('price_quotes.delete');

        $priceQuote->update(['active' => false]);

        return redirect()->back();
    }

    /**
     * Send price quote PDF to customer or custom email address.
     */
    public function sendEmail(
        Request $request,
        PriceQuote $priceQuote,
        ResendService $resendService,
        PriceQuotePdfService $pdfService
    ): RedirectResponse {
        Gate::authorize('price_quotes.view');

        $validated = $request->validate([
            'recipient_email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'custom_message' => 'nullable|string|max:1000',
        ]);

        if (! $priceQuote->price_quote_file || ! Storage::disk('public')->exists($priceQuote->price_quote_file)) {
            $pdfService->generateAndStorePriceQuote($priceQuote);
            $priceQuote->refresh();
        }

        $priceQuote->load([
            'customer',
            'priceQuoteSpecimens.specimenType',
            'priceQuoteSpecimens.examination',
        ]);

        $mail = new PriceQuoteMail(
            $priceQuote,
            $validated['recipient_email'],
            $validated['subject'] ?? null,
            $validated['custom_message'] ?? null
        );

        $sent = $mail->send($resendService);

        if (! $sent) {
            return redirect()->back()->withErrors([
                'email' => 'No se pudo enviar el correo electrónico. Verifique la configuración del servicio de correo.',
            ]);
        }

        return redirect()->back()->with('success', "Cotización enviada exitosamente a {$validated['recipient_email']}.");
    }

    /**
     * Normalize specimens array so relation objects (e.g. from JSON-serialized models) are converted to integer IDs.
     */
    private function normalizeSpecimensInput(Request $request): void
    {
        $specimens = $request->input('specimens', []);
        if (is_array($specimens)) {
            foreach ($specimens as &$specimen) {
                if (isset($specimen['specimen_type']) && is_array($specimen['specimen_type'])) {
                    $specimen['specimen_type'] = $specimen['specimen_type']['id'] ?? null;
                }
                if (isset($specimen['specimen_category']) && is_array($specimen['specimen_category'])) {
                    $specimen['specimen_category'] = $specimen['specimen_category']['id'] ?? null;
                }
                if (isset($specimen['examination_id']) && is_array($specimen['examination_id'])) {
                    $specimen['examination_id'] = $specimen['examination_id']['id'] ?? null;
                }
            }
            unset($specimen);
            $request->merge(['specimens' => $specimens]);
        }
    }
}
