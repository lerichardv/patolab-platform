<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Product;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Sequence;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SpecimenFormDataController extends Controller
{
    /**
     * Return all reference data needed by the specimen form and group sheets.
     *
     * Accepts an optional `specimen_id` query param to also return
     * the full specimen with all its relations.
     */
    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('specimens.view');

        $activeCai = CaiRange::where('status', 'active')->first();
        $activeLocationId = $activeCai?->location_id;

        $sequences = Sequence::where('active', true)->get()->map(function ($sequence) {
            $tempSequence = clone $sequence;
            $currentMonth = now()->format('m');
            $currentYear = now()->format('Y');
            do {
                $paddedSeq = str_pad($tempSequence->current_sequence, $tempSequence->fill ?? 4, '0', STR_PAD_LEFT);
                $paddedMonth = str_pad($currentMonth, 2, '0', STR_PAD_LEFT);
                $sequenceCode = $tempSequence->prefix.$tempSequence->separator.$paddedSeq.$tempSequence->separator.$paddedMonth.$tempSequence->separator.$currentYear;

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

        $data = [
            'specimenTypes' => SpecimenType::where('active', true)->get(),
            'examinations' => SpecimenTypeExamination::where('active', true)->with('prices')->get(),
            'categories' => SpecimenCategory::where('active', true)->get(),
            'referrers' => Referrer::where('active', true)->get(),
            'referrerTypes' => ReferrerType::where('active', true)->get(),
            'priorities' => Priority::orderBy('order', 'desc')->get(),
            'locations' => Location::where('active', true)->get(),
            'sequences' => $sequences,
            'activeLocationId' => $activeLocationId,
            'products' => $products,
            'banks' => Bank::all(),
            'settings' => Setting::all()->pluck('setting_value', 'setting_key'),
        ];

        if ($request->filled('specimen_id')) {
            $specimen = Specimen::with([
                'customerRelation',
                'type',
                'examination.prices',
                'examinations.prices',
                'specimenExaminations.examination.prices',
                'invoiceSpecimens.examination.prices',
                'category',
                'referrerRelation',
                'invoiceRelation.creditRelation',
                'invoiceRelation.transferBank',
                'invoiceRelation.invoiceSpecimens.examination.prices',
                'group.invoice.creditRelation',
                'group.invoice.transferBank',
                'group.invoice.invoiceSpecimens.examination.prices',
                'group.specimens.specimenExaminations.examination.prices',
                'group.specimens.examination.prices',
                'group.specimens.type',
                'group.specimens.customerRelation',
                'group.specimens.products',
                'group.customer',
                'report',
                'products',
            ])->findOrFail($request->integer('specimen_id'));

            $invoice = $specimen->invoiceRelation ?? $specimen->group?->invoice;
            $invoiceSpecimens = $invoice
                ? $invoice->invoiceSpecimens()->where(function ($q) use ($specimen) {
                    $q->where('specimen_id', $specimen->id)->orWhereNull('specimen_id');
                })->with('examination.prices')->get()
                : InvoiceSpecimen::where('specimen_id', $specimen->id)->with('examination.prices')->get();

            $data['specimen'] = $specimen;
            $data['invoice'] = $invoice;
            $data['invoiceSpecimens'] = $invoiceSpecimens;
        } elseif ($request->filled('group_id')) {
            $group = SpecimenGroup::with([
                'customer',
                'invoice.creditRelation',
                'invoice.transferBank',
                'invoice.caiRange',
                'invoice.invoiceSpecimens.examination.prices',
                'specimens.type',
                'specimens.customerRelation',
                'specimens.examination.prices',
                'specimens.examinations.prices',
                'specimens.specimenExaminations.examination.prices',
                'specimens.invoiceSpecimens.examination.prices',
                'specimens.category',
                'specimens.referrerRelation',
                'specimens.priority',
                'specimens.cancelledBy',
                'specimens.products',
            ])->findOrFail($request->integer('group_id'));

            $invoice = $group->invoice;
            $invoiceSpecimens = $invoice
                ? $invoice->invoiceSpecimens()->with('examination.prices')->get()
                : InvoiceSpecimen::where('group_id', $group->id)
                    ->orWhereIn('specimen_id', $group->specimens->pluck('id'))
                    ->with('examination.prices')
                    ->get();

            $data['group'] = $group;
            $data['invoice'] = $invoice;
            $data['invoiceSpecimens'] = $invoiceSpecimens;
        }

        return response()->json($data);
    }
}
