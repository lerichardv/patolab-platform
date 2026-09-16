<?php

namespace App\Http\Controllers;

use App\Models\DeliveryNote;
use App\Models\WorkOrder;
use App\Services\DeliveryNotePdfService;
use App\Services\ImageOptimizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class WorkOrderDeliveryNoteController extends Controller
{
    /**
     * Show the delivery note editor for a work order.
     * Automatically creates the delivery note record if it doesn't exist yet.
     */
    public function show(WorkOrder $workOrder): Response
    {
        $workOrder->load([
            'specimen.customerRelation',
            'specimen.type',
            'specimen.examination',
            'specimen.referrerRelation',
            'deliveryNote',
            'assignedTechnician',
            'task',
        ]);

        $deliveryNote = $workOrder->deliveryNote ?: DeliveryNote::where('work_order_id', $workOrder->id)->first();

        if (! $deliveryNote) {
            $specimen = $workOrder->specimen;
            $customer = $specimen?->customerRelation;
            $orderTypes = $workOrder->types->pluck('name')->implode(', ');
            $dateFormatted = now()->translatedFormat('d \d\e F Y');

            $defaultHtml = '<p>Entrega de bloques con <strong>ACCESO No. '.htmlspecialchars($specimen?->sequence_code ?? '').'</strong> correspondientes a la paciente <em>'.htmlspecialchars($customer?->name ?? 'N/A').'</em></p>'
                .'<p><strong>Descripción del material:</strong> '.(int) $workOrder->quantity.' '.htmlspecialchars($orderTypes ?: 'Muestra').' ('.htmlspecialchars($specimen?->sequence_code ?? '').')</p>'
                .'<p></p>'
                .'<p><strong>El laboratorio no se hace responsable por el manejo otorgado fuera de nuestra unidad.<br>Se brinda instrucciones de su manejo a la persona encargada del traslado.</strong></p>'
                .'<p><strong>Se entrega a:</strong> </p>'
                .'<p><strong>Fecha de entrega:</strong><br>'.$dateFormatted.'</p>';

            $deliveryNote = DeliveryNote::firstOrCreate(
                ['work_order_id' => $workOrder->id],
                [
                    'specimen_id' => $workOrder->specimen_id,
                    'content_html' => $defaultHtml,
                    'created_by_id' => auth()->id(),
                ]
            );

            $workOrder->setRelation('deliveryNote', $deliveryNote);
        }

        return Inertia::render('work-orders/delivery-notes/editor', [
            'workOrder' => $workOrder,
            'deliveryNote' => $deliveryNote,
        ]);
    }

    /**
     * Save the delivery note content and update the PDF.
     */
    public function save(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $request->validate([
            'content_html' => 'nullable|string',
        ]);

        $deliveryNote = $workOrder->deliveryNote ?: DeliveryNote::where('work_order_id', $workOrder->id)->first();
        if (! $deliveryNote) {
            $deliveryNote = DeliveryNote::firstOrCreate(
                ['work_order_id' => $workOrder->id],
                [
                    'specimen_id' => $workOrder->specimen_id,
                    'content_html' => $request->input('content_html', ''),
                    'created_by_id' => auth()->id(),
                ]
            );
        } else {
            $deliveryNote->update([
                'content_html' => $request->input('content_html', ''),
                'updated_by_id' => auth()->id(),
            ]);
        }

        // Generate PDF asynchronously/safely
        try {
            app(DeliveryNotePdfService::class)->generateAndStorePdf($workOrder);
            $deliveryNote->refresh();
        } catch (\Throwable $e) {
            Log::warning('WorkOrderDeliveryNoteController: PDF generation failed during save: '.$e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Nota de entrega guardada correctamente.',
            'deliveryNote' => $deliveryNote,
        ]);
    }

    /**
     * Download or stream the generated PDF.
     */
    public function downloadPdf(WorkOrder $workOrder): SymfonyResponse
    {
        $workOrder->load(['deliveryNote', 'specimen']);
        $deliveryNote = $workOrder->deliveryNote;

        $sequenceCode = $workOrder->specimen ? str_replace(['/', '\\'], '-', $workOrder->specimen->sequence_code) : 'OT-'.$workOrder->id;
        $fileName = "nota_entrega_{$sequenceCode}.pdf";

        if ($deliveryNote && $deliveryNote->pdf_path && Storage::disk('public')->exists($deliveryNote->pdf_path)) {
            return Storage::disk('public')->download($deliveryNote->pdf_path, $fileName);
        }

        $pdfContent = app(DeliveryNotePdfService::class)->generatePdfContent($workOrder);

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="'.$fileName.'"');
    }

    /**
     * Upload an image to embed in the delivery note TipTap editor.
     */
    public function uploadImage(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:10240',
        ]);

        $sequenceCode = $workOrder->specimen ? str_replace(['/', '\\'], '-', $workOrder->specimen->sequence_code) : 'OT-'.$workOrder->id;
        $optimizer = app(ImageOptimizerService::class);
        $path = $optimizer->optimizeAndStore(
            $request->file('image'),
            'delivery-note-images/'.$sequenceCode,
            'public'
        );

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ]);
    }
}
