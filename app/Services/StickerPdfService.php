<?php

namespace App\Services;

use App\Models\Cutting;
use App\Models\Laboratory;
use App\Models\Specimen;
use chillerlan\QRCode\Data\QRMatrix;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Support\Collection;
use Spatie\Browsershot\Browsershot;

class StickerPdfService
{
    protected static ?string $cachedArialNarrowBase64 = null;

    /**
     * Get the base64 encoded Arial Narrow font.
     */
    public function getArialNarrowFontBase64(): string
    {
        if (self::$cachedArialNarrowBase64 === null) {
            $fontPath = public_path('fonts/arialnarrow.ttf');
            if (file_exists($fontPath)) {
                self::$cachedArialNarrowBase64 = base64_encode((string) file_get_contents($fontPath));
            } else {
                self::$cachedArialNarrowBase64 = '';
            }
        }

        return self::$cachedArialNarrowBase64;
    }

    /**
     * Generate inline QR code data URI.
     */
    public function generateQrCode(string $url): string
    {
        $options = new QROptions([
            'version' => -1,
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => true,
            'scale' => 6,
            'addQuietzone' => false,
            'quietzoneSize' => 0,
            'moduleValues' => [
                QRMatrix::M_DATA_DARK => [0, 0, 0],
                QRMatrix::M_FINDER_DARK => [0, 0, 0],
                QRMatrix::M_FINDER_DOT => [0, 0, 0],
                QRMatrix::M_ALIGNMENT_DARK => [0, 0, 0],
                QRMatrix::M_TIMING_DARK => [0, 0, 0],
                QRMatrix::M_FORMAT_DARK => [0, 0, 0],
                QRMatrix::M_VERSION_DARK => [0, 0, 0],
                QRMatrix::M_DARKMODULE => [0, 0, 0],
            ],
        ]);

        return (new QRCode($options))->render($url);
    }

    /**
     * Split a full patient name into 2 balanced lines.
     *
     * @return array{0: string, 1: string}
     */
    public function splitPatientName(string $fullName): array
    {
        $trimmed = trim($fullName);
        if ($trimmed === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/', $trimmed) ?: [];
        $count = count($parts);

        if ($count <= 1) {
            return [$parts[0] ?? '', ''];
        }

        if ($count === 2) {
            return [$parts[0], $parts[1]];
        }

        // For 3 or 4 parts: "Carlos Herminio Perez Mendoza" -> ["Carlos Herminio", "Perez Mendoza"]
        $half = (int) ceil($count / 2);
        $line1 = implode(' ', array_slice($parts, 0, $half));
        $line2 = implode(' ', array_slice($parts, $half));

        return [$line1, $line2];
    }

    /**
     * Format patient name to first name and first surname.
     * E.g. "Carlos Herminio Perez Mendoza" -> "Carlos Perez".
     */
    public function formatShortPatientName(string $fullName): string
    {
        $trimmed = trim($fullName);
        if ($trimmed === '') {
            return '';
        }

        $parts = preg_split('/\s+/', $trimmed) ?: [];
        $count = count($parts);

        if ($count <= 2) {
            return implode(' ', $parts);
        }

        // If 3 parts e.g. "Carlos Perez Mendoza": first is name, second is first surname
        if ($count === 3) {
            return $parts[0].' '.$parts[1];
        }

        // If 4 parts e.g. "Carlos Herminio Perez Mendoza": first is name, third is first surname
        return $parts[0].' '.$parts[2];
    }

    /**
     * Build the short URL for the specimen QR code.
     */
    public function getShortUrlForSpecimen(string $sequenceCode): string
    {
        return url('/s/'.rawurlencode($sequenceCode));
    }

    /**
     * Generate Specimen Sticker PDF (0.9375in x 0.9375in).
     *
     * @param  Collection<int, Specimen>|array<int, Specimen|array<string, mixed>>  $specimens
     */
    public function generateSpecimenStickers(
        Collection|array $specimens,
        ?string $cuttingCode = null,
        bool $isSticker2 = false,
        ?string $laboratoryName = null,
        ?string $biopsyNumber = null,
        ?string $markerName = null,
    ): string {
        $labels = [];
        $items = $specimens instanceof Collection ? $specimens : collect($specimens);

        $defaultLabName = $laboratoryName ?: (rescue(fn () => Laboratory::query()->default()->value('name'), null, false) ?: 'Laboratorio Patolab');

        foreach ($items as $item) {
            if ($item instanceof Specimen) {
                $code = $item->sequence_code ?? 'MUESTRA';
                $customerName = $item->customerRelation?->name ?? 'Paciente';
                $itemCutting = $cuttingCode;

                if ($isSticker2 && $itemCutting === null) {
                    $firstCutting = $item->relationLoaded('cuttings') ? $item->cuttings->first() : $item->cuttings()->with('code')->first();
                    $itemCutting = $firstCutting?->code?->code ?? '';
                }

                $itemLabName = $defaultLabName;
                $itemBiopsyNumber = $biopsyNumber ?? '';
                $itemMarkerName = $markerName ?? '';
            } else {
                // Array/custom object preview
                $code = $item['sequence_code'] ?? 'MUESTRA';
                $customerName = $item['customer_name'] ?? 'Paciente';
                $itemCutting = $item['cutting_code'] ?? $cuttingCode;
                $itemLabName = $item['laboratory_name'] ?? $defaultLabName;
                $itemBiopsyNumber = $item['biopsy_number'] ?? ($biopsyNumber ?? '');
                $itemMarkerName = $item['marker_name'] ?? ($markerName ?? '');
            }

            [$nameLine1, $nameLine2] = $this->splitPatientName($customerName);
            $qrDataUri = $this->generateQrCode($this->getShortUrlForSpecimen($code));

            $labels[] = [
                'code' => $code,
                'laboratory_name' => $itemLabName,
                'biopsy_number' => $itemBiopsyNumber,
                'marker_name' => $itemMarkerName,
                'name_line_1' => $nameLine1,
                'name_line_2' => $nameLine2,
                'cutting_code' => ! empty($itemCutting) ? $itemCutting : null,
                'qr_data_uri' => $qrDataUri,
            ];
        }

        $htmlContent = view('pdf.stickers.specimen_sticker', [
            'labels' => $labels,
            'arialNarrowBase64' => $this->getArialNarrowFontBase64(),
        ])->render();

        return $this->renderBrowsershotPdf($htmlContent, 0.9375, 0.9375, 'in', true);
    }

    /**
     * Generate Sticker 3 PDF (0.75in x 0.2in) for laboratory cassettes.
     *
     * @param  Collection<int, Cutting>|array<int, Cutting|array<string, mixed>>  $cuttings
     */
    public function generateCassetteStickers(
        Collection|array $cuttings,
        ?string $laboratoryName = null
    ): string {
        $labels = [];
        $items = $cuttings instanceof Collection ? $cuttings : collect($cuttings);

        $defaultLabName = $laboratoryName ?: (rescue(fn () => Laboratory::query()->default()->value('name'), null, false) ?: 'Laboratorio Patolab');

        foreach ($items as $item) {
            if ($item instanceof Cutting) {
                $cuttingLetter = $item->code?->code ?? 'M';
                $specimenCode = $item->specimen?->sequence_code ?? '';
                $customerName = $item->specimen?->customerRelation?->name ?? '';
                $itemLabName = $defaultLabName;
            } elseif ($item instanceof Specimen) {
                $firstCutting = $item->relationLoaded('cuttings') ? $item->cuttings->first() : $item->cuttings()->with('code')->first();
                $cuttingLetter = $firstCutting?->code?->code ?? 'A';
                $specimenCode = $item->sequence_code ?? '';
                $customerName = $item->customerRelation?->name ?? '';
                $itemLabName = $defaultLabName;
            } else {
                $cuttingLetter = $item['cutting_code'] ?? 'M';
                $specimenCode = $item['specimen_code'] ?? '';
                $customerName = $item['customer_name'] ?? '';
                $itemLabName = $item['laboratory_name'] ?? $defaultLabName;
            }

            $shortName = $this->formatShortPatientName($customerName);

            $labels[] = [
                'cutting_code' => $cuttingLetter,
                'specimen_code' => $specimenCode,
                'patient_name' => $shortName,
                'laboratory_name' => $itemLabName,
            ];
        }

        $htmlContent = view('pdf.stickers.cassette_sticker', [
            'labels' => $labels,
            'arialNarrowBase64' => $this->getArialNarrowFontBase64(),
        ])->render();

        return $this->renderBrowsershotPdf($htmlContent, 0.75, 0.2, 'in', false);
    }

    /**
     * Helper to render PDF via Spatie Browsershot with exact dimensions and 0 margins.
     */
    protected function renderBrowsershotPdf(string $htmlContent, float $width, float $height, string $unit = 'in', bool $landscape = false): string
    {
        $browsershot = Browsershot::html($htmlContent);

        if (app()->environment('production')) {
            $browsershot->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'));
        } elseif (env('PUPPETEER_EXECUTABLE_PATH')) {
            $browsershot->setChromePath(env('PUPPETEER_EXECUTABLE_PATH'));
        } elseif (file_exists('/opt/homebrew/bin/chromium')) {
            $browsershot->setChromePath('/opt/homebrew/bin/chromium');
        }

        $browsershot->addChromiumArguments([
            'disable-crash-reporter',
            'disable-crashpad',
            'disable-features=Crashpad',
            'disable-dev-shm-usage',
            'no-sandbox',
            'user-data-dir=/tmp/chrome-patolab-temp',
        ])
            ->noSandbox()
            ->paperSize($width, $height, $unit)
            ->setOption('preferCSSPageSize', true)
            ->showBackground()
            ->margins(0, 0, 0, 0)
            ->timeout(60);

        if ($landscape) {
            $browsershot->landscape();
        }

        return $browsershot->pdf();
    }
}
