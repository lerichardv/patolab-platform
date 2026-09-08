<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class InvoiceFormDataController extends Controller
{
    /**
     * Return all reference data and optional invoice details needed by the invoice edit sheet.
     */
    public function __invoke(Request $request): JsonResponse
    {
        if (! Gate::check('invoices.view') && ! Gate::check('specimens.view')) {
            Gate::authorize('invoices.view');
        }

        $data = [
            'banks' => Bank::all(),
            'specimenTypes' => SpecimenType::where('active', true)->orderBy('name', 'asc')->get(),
            'examinations' => SpecimenTypeExamination::where('active', true)->with('prices')->get(),
            'settings' => Setting::all()->pluck('setting_value', 'setting_key'),
        ];

        if ($request->filled('invoice_id')) {
            $invoice = Invoice::with([
                'customer',
                'caiRange',
                'transferBank',
                'creditRelation',
                'invoiceSpecimens.examination.prices',
                'invoiceSpecimens.specimen.customerRelation',
                'group.invoice.creditRelation',
                'group.invoice.transferBank',
                'group.invoice.caiRange',
                'group.invoice.invoiceSpecimens.examination.prices',
                'group.specimens.type',
                'group.specimens.customerRelation',
                'group.specimens.examination.prices',
                'group.specimens.examinations.prices',
                'group.specimens.specimenExaminations.examination.prices',
                'group.specimens.invoiceSpecimens.examination.prices',
                'group.specimens.category',
                'group.specimens.referrerRelation',
                'group.specimens.priority',
                'group.specimens.cancelledBy',
                'group.specimens.products',
                'specimen.type',
                'specimen.customerRelation',
                'specimen.examination.prices',
                'specimen.examinations.prices',
                'specimen.specimenExaminations.examination.prices',
                'specimen.invoiceSpecimens.examination.prices',
                'specimen.category',
                'specimen.referrerRelation',
                'specimen.priority',
                'specimen.cancelledBy',
                'specimen.products',
            ])->findOrFail($request->integer('invoice_id'));

            $data['invoice'] = $invoice;
        }

        return response()->json($data);
    }
}
