<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResendService
{
    protected string $apiKey;

    protected string $from;

    public function __construct()
    {
        $this->apiKey = env('RESEND_API_KEY') ?: '';

        $fromAddress = config('mail.from.address') ?: env('MAIL_FROM_ADDRESS', 'onboarding@resend.dev');
        $fromName = config('mail.from.name') ?: env('MAIL_FROM_NAME', 'PatoLab');

        // Format: Name <email@domain.com>
        $this->from = "{$fromName} <{$fromAddress}>";
    }

    /**
     * Send an email using Resend API.
     *
     * @param  string  $to  Recipient email address
     * @param  string  $subject  Subject line
     * @param  string  $htmlContent  HTML body content
     * @param  array  $attachments  Array of attachments: [['content' => 'base64...', 'filename' => '...', 'contentId' => '...']]
     * @return bool True if successful, false otherwise
     */
    public function sendEmail(string $to, string $subject, string $htmlContent, array $attachments = []): bool
    {
        if (empty($this->apiKey)) {
            Log::error('ResendService: RESEND_API_KEY is not configured in the .env file.');

            return false;
        }

        $payload = [
            'from' => $this->from,
            'to' => [$to],
            'subject' => $subject,
            'html' => $htmlContent,
        ];

        if (! empty($attachments)) {
            $payload['attachments'] = $attachments;
        }

        try {
            Log::info("ResendService: Sending email to {$to} with subject '{$subject}'...");
            $response = Http::withToken($this->apiKey)
                ->post('https://api.resend.com/emails', $payload);

            if ($response->successful()) {
                Log::info("ResendService: Email successfully sent to {$to}. Response ID: ".($response->json('id') ?? 'N/A'));

                return true;
            }

            Log::error("ResendService: Failed to send email to {$to}. Status: {$response->status()}, Response: {$response->body()}");

            return false;
        } catch (\Exception $e) {
            Log::error("ResendService: Exception encountered while sending email to {$to}: {$e->getMessage()}");

            return false;
        }
    }
}
