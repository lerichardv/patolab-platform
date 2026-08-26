<?php

namespace App\Http\Controllers;

use App\Models\SpecimenReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ReportVerificationController extends Controller
{
    /**
     * Handle the incoming request for report verification.
     */
    public function __invoke(Request $request, string $report_code)
    {
        $token = $request->query('t');

        if (empty($token)) {
            return response()->view('verification.invalid', [
                'reason' => 'Parámetro de autenticación ausente (token no proporcionado).',
            ], 400);
        }

        $report = SpecimenReport::with([
            'specimens.customerRelation',
            'specimens.examination',
            'specimens.examinations',
            'specimens.type',
            'specimens.referrerRelation',
            'specimens.users',
        ])
            ->where('report_code', strtoupper($report_code))
            ->orWhere('report_code', strtolower($report_code))
            ->first();

        if (! $report || ! $report->report_validation_token || ! hash_equals((string) $report->report_validation_token, (string) $token)) {
            return response()->view('verification.invalid', [
                'reason' => 'El código de informe o el token de verificación no coincide con ningún documento autenticado emitido por PatoLab.',
            ], 404);
        }

        $specimen = $report->specimens->first();

        if (! $specimen || ! in_array($specimen->status, ['finalized', 'delivered'])) {
            return response()->view('verification.invalid', [
                'reason' => 'El informe correspondiente a este código se encuentra en proceso y aún no ha sido finalizado oficialmente.',
            ], 422);
        }

        $patientName = $report->specimens
            ->map(fn ($s) => $s->customerRelation?->name)
            ->filter()
            ->unique()
            ->implode(', ') ?: ($specimen->customerRelation?->name ?? 'Paciente N/A');

        $specimenType = $report->specimens
            ->map(fn ($s) => $s->type?->name)
            ->filter()
            ->unique()
            ->implode(', ') ?: 'N/A';

        $studies = collect();
        foreach ($report->specimens as $spec) {
            if ($spec->examinations && $spec->examinations->isNotEmpty()) {
                foreach ($spec->examinations as $exam) {
                    if (! empty($exam->name)) {
                        $studies->push($exam->name);
                    }
                }
            }
            if (! empty($spec->examination?->name)) {
                $studies->push($spec->examination->name);
            }
        }

        $studiesList = $studies->unique()->filter()->values();
        if ($studiesList->isEmpty()) {
            $studiesList = collect(['Estudio de Anatomía Patológica']);
        }
        $study = $studiesList->implode(', ');

        $pathologists = $report->specimens
            ->flatMap(fn ($s) => $s->users)
            ->pluck('name')
            ->filter()
            ->unique()
            ->implode(', ');

        if (empty($pathologists)) {
            $pathologists = 'Laboratorio PatoLab';
        }

        $issuedAt = $report->report_finalization_datetime
            ?? $report->finalization_date
            ?? $report->generated_at
            ?? $report->created_at;

        $pdfHash = 'N/A';
        $pdfUrl = null;
        if (! empty($report->report_file) && Storage::disk('public')->exists($report->report_file)) {
            $fullPath = Storage::disk('public')->path($report->report_file);
            $pdfHash = hash_file('sha256', $fullPath) ?: 'N/A';
            $pdfUrl = Storage::disk('public')->url($report->report_file);
        }

        $sequenceCode = $report->specimens->pluck('sequence_code')->filter()->unique()->implode(', ');

        return response()->view('verification.valid', [
            'report' => $report,
            'specimen' => $specimen,
            'patientName' => $patientName,
            'specimenType' => $specimenType,
            'study' => $study,
            'studiesList' => $studiesList,
            'pathologist' => $pathologists,
            'issuedAt' => $issuedAt,
            'pdfHash' => $pdfHash,
            'pdfUrl' => $pdfUrl,
            'reportCode' => $report->report_code,
            'sequenceCode' => $sequenceCode,
        ]);
    }
}
