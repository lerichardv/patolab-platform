<?php

namespace App\Jobs;

use App\Mail\PriceQuoteMail;
use App\Models\PriceQuote;
use App\Services\ResendService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendPriceQuoteEmailJob implements ShouldQueue
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

    public function handle(ResendService $resend): bool
    {
        $mail = new PriceQuoteMail(
            $this->priceQuote,
            $this->recipientEmail,
            $this->customSubject,
            $this->customMessage
        );

        return $mail->send($resend);
    }
}
