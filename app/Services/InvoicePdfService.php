<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Location;
use App\Models\SpecimenTypeExamination;
use App\Models\Customer;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Spatie\Browsershot\Browsershot;

class InvoicePdfService
{
    /**
     * Generate the invoice PDF and store it.
     */
    public function generateAndStoreInvoice(Invoice $invoice): string
    {
        $invoice->load([
            'specimen.products',
            'specimen.examination.prices',
            'creditRelation',
            'customer',
            'caiRange',
            'groupSpecimens.specimen.examination',
            'groupSpecimens.specimen.customerRelation',
            'groupSpecimens.specimen.examination.prices',
            'groupSpecimens.specimen.products'
        ]);

        $totalWords = $this->numberToSpanishWords((float) $invoice->total);

        $customer = $invoice->customer;
        $caiRange = $invoice->caiRange;
        $location = Location::find($caiRange->location_id);
        $examination = null;
        if ($invoice->specimen) {
            $examination = SpecimenTypeExamination::find($invoice->specimen->specimen_type_examination);
        }

        $htmlContent = view('pdf.invoice', compact('invoice', 'caiRange', 'customer', 'examination', 'location', 'totalWords'))->render();

        if ($invoice->invoice_file && Storage::disk('public')->exists($invoice->invoice_file)) {
            Storage::disk('public')->delete($invoice->invoice_file);
        }

        $filename = 'invoice_'.$invoice->id.'_'.time().'.pdf';
        $pdfPath = 'invoices/'.$filename;

        $browsershot = Browsershot::html($htmlContent);

        if (app()->environment('production')) {
            $browsershot->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'));
        } elseif (env('PUPPETEER_EXECUTABLE_PATH')) {
            $browsershot->setChromePath(env('PUPPETEER_EXECUTABLE_PATH'));
        }

        $pdfContent = $browsershot->addChromiumArguments([
            'disable-crash-reporter',
            'disable-dev-shm-usage',
            'no-sandbox',
        ])
            ->noSandbox()
            ->margins(10, 10, 10, 10)
            ->format('A4')
            ->pdf();

        Storage::disk('public')->put($pdfPath, $pdfContent);
        $invoice->update(['invoice_file' => $pdfPath]);

        return $pdfPath;
    }

    public function numberToSpanishWords(float $number): string
    {
        $amount = number_format($number, 2, '.', '');
        $parts = explode('.', $amount);
        $integerPart = (int) $parts[0];
        $decimalPart = $parts[1];

        if ($integerPart === 0) {
            $integerWords = 'CERO';
        } else {
            $integerWords = $this->numberToSpanishWordsHelper($integerPart);
        }

        return $integerWords.' CON '.$decimalPart.'/100';
    }

    protected function numberToSpanishWordsHelper(int $number): string
    {
        $units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        $tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        $teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        $twenties = ['VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
        $hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        if ($number < 10) {
            return $units[$number];
        }
        if ($number < 20) {
            return $teens[$number - 10];
        }
        if ($number < 30) {
            return $twenties[$number - 20];
        }
        if ($number < 100) {
            $ten = (int) ($number / 10);
            $unit = $number % 10;

            return $tens[$ten].($unit > 0 ? ' Y '.$units[$unit] : '');
        }
        if ($number < 1000) {
            if ($number === 100) {
                return 'CIEN';
            }
            $hundred = (int) ($number / 100);
            $remainder = $number % 100;

            return $hundreds[$hundred].($remainder > 0 ? ' '.$this->numberToSpanishWordsHelper($remainder) : '');
        }
        if ($number < 1000000) {
            $thousands = (int) ($number / 1000);
            $remainder = $number % 1000;
            $prefix = $thousands === 1 ? 'MIL' : $this->numberToSpanishWordsHelper($thousands).' MIL';

            return $prefix.($remainder > 0 ? ' '.$this->numberToSpanishWordsHelper($remainder) : '');
        }
        if ($number < 1000000000) {
            $millions = (int) ($number / 1000000);
            $remainder = $number % 1000000;
            $prefix = $millions === 1 ? 'UN MILLON' : $this->numberToSpanishWordsHelper($millions).' MILLONES';

            return $prefix.($remainder > 0 ? ' '.$this->numberToSpanishWordsHelper($remainder) : '');
        }

        return '';
    }
}
