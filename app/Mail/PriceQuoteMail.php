<?php

namespace App\Mail;

use App\Models\PriceQuote;
use App\Services\ResendService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PriceQuoteMail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public PriceQuote $priceQuote,
        public string $recipientEmail,
        public ?string $customSubject = null,
        public ?string $customMessage = null,
    ) {
        $this->afterCommit = true;
    }

    /**
     * Handle job execution via ResendService.
     */
    public function handle(ResendService $resend): bool
    {
        return $this->send($resend);
    }

    /**
     * Send price quote email via ResendService, matching the SendSpecimenEmailJob process.
     */
    public function send(ResendService $resend): bool
    {
        $to = $this->recipientEmail;
        $subject = ! empty($this->customSubject)
            ? $this->customSubject
            : "Cotización #{$this->priceQuote->price_quote_id} — PatoLab";

        $attachments = [];
        if ($this->priceQuote->price_quote_file && Storage::disk('public')->exists($this->priceQuote->price_quote_file)) {
            $attachments[] = [
                'content' => base64_encode(Storage::disk('public')->get($this->priceQuote->price_quote_file)),
                'filename' => "Cotizacion_{$this->priceQuote->price_quote_id}.pdf",
            ];
        } else {
            Log::error("PriceQuoteMail: PDF file not found on public storage for PriceQuote #{$this->priceQuote->price_quote_id}.");
        }

        $htmlContent = view('emails.price_quote', [
            'priceQuote' => $this->priceQuote,
            'customerName' => $this->priceQuote->customer?->name ?: 'Cliente',
            'customMessage' => $this->customMessage,
        ])->render();

        return $resend->sendEmail($to, $subject, $htmlContent, $attachments);
    }
}
