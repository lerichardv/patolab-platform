<?php

namespace App\Http\Controllers;

use App\Models\Cutting;
use App\Models\Laboratory;
use App\Models\Specimen;
use App\Services\StickerPdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class StickerController extends Controller
{
    public function __construct(
        protected StickerPdfService $stickerPdfService
    ) {}

    /**
     * Generate PDF for Specimen Sticker (Muestra / Frasco / Corte).
     */
    public function generateSpecimensPdf(Request $request): Response
    {
        Gate::authorize('specimens.view');

        $validated = $request->validate([
            'specimen_ids' => ['nullable', 'array'],
            'specimen_ids.*' => ['integer'],
            'cutting_id' => ['nullable', 'integer'],
            'cutting_code' => ['nullable', 'string'],
            'laboratory_id' => ['nullable', 'integer'],
            'laboratory_name' => ['nullable', 'string', 'max:255'],
            'biopsy_number' => ['nullable', 'string', 'max:100'],
            'marker_name' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'in:muestra,frasco,corte'],
            'preview_data' => ['nullable', 'array'],
            'preview_data.*.sequence_code' => ['required_with:preview_data', 'string'],
            'preview_data.*.customer_name' => ['nullable', 'string'],
            'preview_data.*.cutting_code' => ['nullable', 'string'],
            'preview_data.*.laboratory_name' => ['nullable', 'string'],
            'preview_data.*.biopsy_number' => ['nullable', 'string'],
            'preview_data.*.marker_name' => ['nullable', 'string'],
        ]);

        $cuttingCode = $validated['cutting_code'] ?? null;
        if (! empty($validated['cutting_id']) && $cuttingCode === null) {
            $cutting = Cutting::with('code')->find($validated['cutting_id']);
            $cuttingCode = $cutting?->code?->code;
        }

        $laboratoryName = $validated['laboratory_name'] ?? null;
        if (empty($laboratoryName) && ! empty($validated['laboratory_id'])) {
            $lab = Laboratory::find($validated['laboratory_id']);
            $laboratoryName = $lab?->name;
        }

        $biopsyNumber = $validated['biopsy_number'] ?? null;
        $markerName = $validated['marker_name'] ?? null;
        $isSticker2 = ! empty($cuttingCode) || ($validated['type'] ?? '') === 'corte';

        if (! empty($validated['preview_data'])) {
            $pdfContent = $this->stickerPdfService->generateSpecimenStickers(
                $validated['preview_data'],
                $cuttingCode,
                $isSticker2,
                $laboratoryName,
                $biopsyNumber,
                $markerName
            );
        } else {
            $specimenIds = $validated['specimen_ids'] ?? [];
            if (empty($specimenIds)) {
                abort(400, 'Debe especificar al menos una muestra para generar el sticker.');
            }

            $specimens = Specimen::with(['customerRelation', 'cuttings.code'])
                ->whereIn('id', $specimenIds)
                ->get();

            if ($specimens->isEmpty()) {
                abort(404, 'No se encontraron las muestras solicitadas.');
            }

            $pdfContent = $this->stickerPdfService->generateSpecimenStickers(
                $specimens,
                $cuttingCode,
                $isSticker2,
                $laboratoryName,
                $biopsyNumber,
                $markerName
            );
        }

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="stickers-muestras.pdf"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Generate PDF for Cassette Sticker 3 (0.75in x 0.2in).
     */
    public function generateCuttingsPdf(Request $request): Response
    {
        Gate::authorize('specimens.view');

        $validated = $request->validate([
            'cutting_ids' => ['nullable', 'array'],
            'cutting_ids.*' => ['integer'],
            'specimen_ids' => ['nullable', 'array'],
            'specimen_ids.*' => ['integer'],
            'laboratory_id' => ['nullable', 'integer'],
            'laboratory_name' => ['nullable', 'string', 'max:255'],
            'preview_data' => ['nullable', 'array'],
            'preview_data.*.cutting_code' => ['required_with:preview_data', 'string'],
            'preview_data.*.specimen_code' => ['required_with:preview_data', 'string'],
            'preview_data.*.customer_name' => ['nullable', 'string'],
            'preview_data.*.laboratory_name' => ['nullable', 'string'],
        ]);

        $laboratoryName = $validated['laboratory_name'] ?? null;
        if (empty($laboratoryName) && ! empty($validated['laboratory_id'])) {
            $lab = Laboratory::find($validated['laboratory_id']);
            $laboratoryName = $lab?->name;
        }

        if (! empty($validated['preview_data'])) {
            $pdfContent = $this->stickerPdfService->generateCassetteStickers(
                $validated['preview_data'],
                $laboratoryName
            );
        } elseif (! empty($validated['cutting_ids'])) {
            $cuttings = Cutting::with(['code', 'specimen.customerRelation'])
                ->whereIn('id', $validated['cutting_ids'])
                ->get();

            if ($cuttings->isEmpty()) {
                abort(404, 'No se encontraron los cortes solicitados.');
            }

            $pdfContent = $this->stickerPdfService->generateCassetteStickers(
                $cuttings,
                $laboratoryName
            );
        } elseif (! empty($validated['specimen_ids'])) {
            $specimens = Specimen::with(['customerRelation', 'cuttings.code'])
                ->whereIn('id', $validated['specimen_ids'])
                ->get();

            if ($specimens->isEmpty()) {
                abort(404, 'No se encontraron las muestras solicitadas.');
            }

            $itemsToPrint = collect();
            foreach ($specimens as $specimen) {
                if ($specimen->cuttings->isNotEmpty()) {
                    foreach ($specimen->cuttings as $cutting) {
                        $itemsToPrint->push($cutting);
                    }
                } else {
                    $itemsToPrint->push([
                        'cutting_code' => 'A',
                        'specimen_code' => $specimen->sequence_code,
                        'customer_name' => $specimen->customerRelation?->name,
                        'laboratory_name' => $laboratoryName,
                    ]);
                }
            }

            $pdfContent = $this->stickerPdfService->generateCassetteStickers(
                $itemsToPrint,
                $laboratoryName
            );
        } else {
            abort(400, 'Debe especificar al menos un corte o muestra para generar los stickers de casettes.');
        }

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="stickers-casettes.pdf"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Short URL redirection for scanned QR codes: https://[domain]/s/{code}
     */
    public function redirectShortUrl(string $code)
    {
        $code = trim(urldecode($code));

        $specimen = Specimen::where('sequence_code', $code)->first();

        if ($specimen) {
            return redirect()->to('/specimens?search='.urlencode($specimen->sequence_code).'&specimen='.urlencode($specimen->sequence_code).'&action=view');
        }

        return redirect()->to('/specimens?search='.urlencode($code));
    }
}
