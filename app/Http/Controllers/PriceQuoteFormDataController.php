<?php

namespace App\Http\Controllers;

use App\Models\PriceQuote;
use App\Models\Setting;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PriceQuoteFormDataController extends Controller
{
    /**
     * Return reference data and optional price quote details needed by the price quote sheet.
     */
    public function __invoke(Request $request): JsonResponse
    {
        if (! Gate::check('price_quotes.view') && ! Gate::check('price_quotes.create') && ! Gate::check('price_quotes.edit')) {
            Gate::authorize('price_quotes.view');
        }

        $data = [
            'specimenTypes' => SpecimenType::where('active', true)->orderBy('name', 'asc')->get(),
            'specimenCategories' => SpecimenCategory::where('active', true)->orderBy('name', 'asc')->get(),
            'examinations' => SpecimenTypeExamination::where('active', true)->with('prices')->orderBy('name', 'asc')->get(),
            'settings' => Setting::all()->pluck('setting_value', 'setting_key'),
        ];

        if ($request->filled('price_quote_id')) {
            $id = $request->input('price_quote_id');
            $priceQuote = PriceQuote::with([
                'customer',
                'priceQuoteSpecimens.specimenType',
                'priceQuoteSpecimens.specimenCategory',
                'priceQuoteSpecimens.examination.prices',
            ])
                ->where('id', $id)
                ->orWhere('price_quote_id', $id)
                ->firstOrFail();

            $priceQuote->setRelation('specimens', $priceQuote->priceQuoteSpecimens);

            $data['priceQuote'] = $priceQuote;
        }

        return response()->json($data);
    }
}
