<?php

namespace App\Services;

use App\Models\WorkOrder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Spatie\Browsershot\Browsershot;

class DeliveryNotePdfService
{
    /**
     * Generate the PDF delivery note and store it in storage/public/delivery_notes.
     *
     * @return string The generated PDF file path relative to public storage
     */
    public function generateAndStorePdf(WorkOrder $workOrder): string
    {
        $pdfContent = $this->generatePdfContent($workOrder);

        $specimen = $workOrder->specimen;
        $sequenceCode = $specimen ? str_replace(['/', '\\'], '-', $specimen->sequence_code) : 'WO-'.$workOrder->id;
        $pdfPath = 'delivery_notes/delivery_note_'.$workOrder->id.'_'.$sequenceCode.'_'.time().'.pdf';

        $deliveryNote = $workOrder->deliveryNote;
        if ($deliveryNote && $deliveryNote->pdf_path && Storage::disk('public')->exists($deliveryNote->pdf_path)) {
            Storage::disk('public')->delete($deliveryNote->pdf_path);
        }

        Storage::disk('public')->put($pdfPath, $pdfContent);

        if ($deliveryNote) {
            $deliveryNote->update([
                'pdf_path' => $pdfPath,
            ]);
        }

        return $pdfPath;
    }

    /**
     * Generates PDF binary content using Browsershot.
     */
    public function generatePdfContent(WorkOrder $workOrder, &$pages = null): string
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

        $specimen = $workOrder->specimen;
        $customer = $specimen?->customerRelation;
        $referrer = $specimen?->referrerRelation;
        $deliveryNote = $workOrder->deliveryNote;

        $contentHtml = $deliveryNote?->content_html ?? '';
        $contentHtmlWithBase64 = $this->convertImagesToBase64($contentHtml);

        $pages = DeliveryNotePaginator::paginate($contentHtmlWithBase64);

        $htmlContent = view('pdf.delivery_note.body', compact(
            'workOrder',
            'specimen',
            'customer',
            'referrer',
            'deliveryNote',
            'pages'
        ))->render();

        $browsershot = Browsershot::html($htmlContent);

        if (app()->environment('production')) {
            $browsershot->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'));
        }

        return $browsershot->addChromiumArguments([
            'disable-crash-reporter',
            'disable-dev-shm-usage',
            'no-sandbox',
        ])
            ->noSandbox()
            ->paperWidth('215.9mm')
            ->paperHeight('279.4mm')
            ->margins(0, 0, 0, 0)
            ->timeout(120)
            ->waitUntilNetworkIdle()
            ->pdf();
    }

    /**
     * Convert image src attributes in the given HTML to Base64 inline data URIs.
     */
    private function convertImagesToBase64(string $html): string
    {
        if (empty($html)) {
            return $html;
        }

        return preg_replace_callback('/<img\s+([^>]*\s*)src=["\']([^"\']+)["\']([^>]*)/i', function ($matches) {
            $beforeSrc = $matches[1];
            $url = $matches[2];
            $afterSrc = $matches[3];

            if (str_starts_with($url, 'data:image/')) {
                return $matches[0];
            }

            $base64 = $this->getImageBase64($url);
            if ($base64) {
                return '<img '.$beforeSrc.'src="'.$base64.'"'.$afterSrc;
            }

            return $matches[0];
        }, $html);
    }

    /**
     * Retrieve base64 encoded data URI of an image by local path mapping or URL request.
     */
    private function getImageBase64(string $url): ?string
    {
        try {
            $path = parse_url($url, PHP_URL_PATH);
            if (! $path) {
                return null;
            }

            // Check public disk /storage/
            if (str_starts_with($path, '/storage/')) {
                $storagePath = substr($path, strlen('/storage/'));
                if (Storage::disk('public')->exists($storagePath)) {
                    $content = Storage::disk('public')->get($storagePath);
                    $mime = Storage::disk('public')->mimeType($storagePath) ?: 'image/png';

                    return 'data:'.$mime.';base64,'.base64_encode($content);
                }
            }

            // Check local public path
            $localPublicPath = public_path(ltrim($path, '/'));
            if (file_exists($localPublicPath)) {
                $content = file_get_contents($localPublicPath);
                $mime = mime_content_type($localPublicPath) ?: 'image/png';

                return 'data:'.$mime.';base64,'.base64_encode($content);
            }
        } catch (\Throwable $e) {
            Log::warning("DeliveryNotePdfService: Failed to resolve image base64 for {$url}: ".$e->getMessage());
        }

        return null;
    }
}
