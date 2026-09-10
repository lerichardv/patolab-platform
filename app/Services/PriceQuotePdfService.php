<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Location;
use App\Models\PriceQuote;
use App\Models\Setting;
use Illuminate\Support\Facades\Storage;
use Spatie\Browsershot\Browsershot;

class PriceQuotePdfService
{
    /**
     * Generate the price quote PDF and store it.
     */
    public function generateAndStorePriceQuote(PriceQuote $priceQuote): string
    {
        $priceQuote->load([
            'customer',
            'priceQuoteSpecimens.specimenType',
            'priceQuoteSpecimens.specimenCategory',
            'priceQuoteSpecimens.examination.prices',
        ]);

        $totalWords = $this->numberToSpanishWords((float) $priceQuote->total);

        $customer = $priceQuote->customer;
        if (! $customer) {
            $customer = new Customer([
                'name' => 'Consumidor Final',
                'id_number' => 'N/A',
                'phone' => 'N/A',
                'email' => '',
            ]);
        }

        $defaultLocationId = Setting::where('setting_key', 'default_location_id')->value('setting_value');
        $location = $defaultLocationId ? Location::find($defaultLocationId) : Location::first();

        $htmlContent = view('pdf.price_quote', compact('priceQuote', 'customer', 'location', 'totalWords'))->render();
        $filename = 'price_quote_'.$priceQuote->id.'_'.time().'.pdf';

        $pdfPath = 'price_quotes/'.$filename;

        if ($priceQuote->price_quote_file && Storage::disk('public')->exists($priceQuote->price_quote_file)) {
            Storage::disk('public')->delete($priceQuote->price_quote_file);
        }

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
        $priceQuote->update(['price_quote_file' => $pdfPath]);

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
