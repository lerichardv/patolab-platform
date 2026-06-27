<?php

namespace App\Services;

use App\Models\Specimen;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Spatie\Browsershot\Browsershot;

class ReportPdfService
{
    /**
     * Generate the PDF report for the specimen and store it in the report_file column.
     *
     * @return string The generated PDF file path
     */
    public function generateAndStoreReport(Specimen $specimen): string
    {
        $pdfContent = $this->generatePdfContent($specimen);
        $pdfPath = 'reports/report_'.$specimen->sequence_code.'_'.time().'.pdf';

        if ($specimen->report->report_file) {
            Storage::disk('public')->delete($specimen->report->report_file);
        }

        Storage::disk('public')->put($pdfPath, $pdfContent);
        $specimen->report->update([
            'report_file' => $pdfPath,
        ]);

        Storage::disk('public')->deleteDirectory("temp_reports/{$specimen->sequence_code}");

        return $pdfPath;
    }

    /**
     * Helper to generate PDF content using Browsershot.
     */
    public function generatePdfContent(Specimen $specimen, &$pages = null)
    {
        $specimen->load(['customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'report', 'users.role']);
        if (! $specimen->report) {
            abort(404, 'No hay reporte asociado a esta muestra.');
        }

        $customer = $specimen->customerRelation;
        // Clone the report instance to avoid mutating the model's attributes in-memory,
        // which can lead to accidental dirty database updates and excessively large audit logs.
        $report = clone $specimen->report;
        $examination = $specimen->examination;
        $referrer = $specimen->referrerRelation;

        // Convert pathologists' signatures to Base64
        foreach ($specimen->users as $user) {
            $user->signature_base64 = null;
            if ($user->user_signature) {
                if (Storage::disk('public')->exists($user->user_signature)) {
                    $fileContent = Storage::disk('public')->get($user->user_signature);
                    $mime = Storage::disk('public')->mimeType($user->user_signature) ?: 'image/png';
                    $user->signature_base64 = 'data:'.$mime.';base64,'.base64_encode($fileContent);
                } else {
                    $url = Storage::disk('public')->url($user->user_signature);
                    $user->signature_base64 = $this->getImageBase64($url);
                }
            }
        }

        // Convert all local/remote images in editor contents to Base64 data URIs so Browsershot can render them.
        $report->diagnosis_html = $this->convertImagesToBase64($report->diagnosis_html);
        $report->macroscopy_html = $this->convertImagesToBase64($report->macroscopy_html);
        $report->microscopy_html = $this->convertImagesToBase64($report->microscopy_html);
        $report->clinical_details_html = $this->convertImagesToBase64($report->clinical_details_html);
        $report->comments_notes_html = $this->convertImagesToBase64($report->comments_notes_html);
        $report->protocols_html = $this->convertImagesToBase64($report->protocols_html);
        $report->legend_html = $this->convertImagesToBase64($report->legend_html);

        $isMicroscopyVisible = in_array($specimen->status, ['microscopic_review', 'finalized', 'delivered']);

        $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, $isMicroscopyVisible);

        $htmlContent = view('pdf.report.body', compact('specimen', 'report', 'customer', 'examination', 'referrer', 'pages'))->render();

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
    private function convertImagesToBase64($html)
    {
        if (empty($html)) {
            return $html;
        }

        return preg_replace_callback('/<img\s+([^>]*\s*)src=["\']([^"\']+)["\']([^>]*)/i', function ($matches) {
            $beforeSrc = $matches[1];
            $url = $matches[2];
            $afterSrc = $matches[3];

            Log::info("ReportPdfService: Found image in HTML. Source URL: {$url}");

            if (str_starts_with($url, 'data:image/')) {
                Log::info("ReportPdfService: Image is already in base64 format.");
                return $matches[0];
            }

            $base64 = $this->getImageBase64($url);
            if ($base64) {
                Log::info("ReportPdfService: Successfully converted URL to base64.");
                return '<img '.$beforeSrc.'src="'.$base64.'"'.$afterSrc;
            }

            Log::warning("ReportPdfService: Could not convert image to base64. Keeping original URL: {$url}");
            return $matches[0];
        }, $html);
    }

    /**
     * Retrieve base64 encoded data URI of an image by local path mapping or URL request.
     */
    private function getImageBase64($url)
    {
        Log::info("ReportPdfService: Resolving base64 for image URL: {$url}");
        $path = parse_url($url, PHP_URL_PATH);
        Log::info("ReportPdfService: Parsed URL path: " . ($path ?? 'NULL'));

        if ($path) {
            if (preg_match('/^\/storage\/(.+)$/', $path, $storageMatches)) {
                $relativePath = $storageMatches[1];
                $localPath = storage_path('app/public/'.$relativePath);
                Log::info("ReportPdfService: Matched /storage/ path. Checking local file: {$localPath}");

                if (file_exists($localPath)) {
                    $data = file_get_contents($localPath);
                    $mime = mime_content_type($localPath) ?: 'image/jpeg';
                    Log::info("ReportPdfService: Local storage file exists. Size: " . strlen($data) . " bytes. Mime: {$mime}");

                    return 'data:'.$mime.';base64,'.base64_encode($data);
                } else {
                    Log::warning("ReportPdfService: Local storage file DOES NOT exist: {$localPath}");
                }
            }

            $publicPath = public_path(ltrim($path, '/'));
            Log::info("ReportPdfService: Checking public path: {$publicPath}");
            if (file_exists($publicPath)) {
                $data = file_get_contents($publicPath);
                $mime = mime_content_type($publicPath) ?: 'image/jpeg';
                Log::info("ReportPdfService: Local public file exists. Size: " . strlen($data) . " bytes. Mime: {$mime}");

                return 'data:'.$mime.';base64,'.base64_encode($data);
            } else {
                Log::info("ReportPdfService: Local public file DOES NOT exist: {$publicPath}");
            }
        }

        Log::info("ReportPdfService: Falling back to HTTP request for remote file: {$url}");
        try {
            $data = @file_get_contents($url);
            if ($data !== false) {
                $mime = 'image/jpeg';
                $ext = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION);
                if (in_array(strtolower($ext), ['png', 'gif', 'webp', 'svg'])) {
                    $mime = 'image/'.strtolower($ext);
                    if (strtolower($ext) === 'svg') {
                        $mime = 'image/svg+xml';
                    }
                }
                Log::info("ReportPdfService: Successfully fetched remote file. Size: " . strlen($data) . " bytes. Mime: {$mime}");

                return 'data:'.$mime.';base64,'.base64_encode($data);
            } else {
                Log::error("ReportPdfService: file_get_contents returned false for URL: {$url}");
            }
        } catch (\Exception $e) {
            Log::error("ReportPdfService: Exception while fetching remote URL {$url}: " . $e->getMessage());
        }

        return null;
    }
}
