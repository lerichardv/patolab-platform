<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    public function sendText(string $phone, string $message)
    {
        $cleanPhone = preg_replace('/\D/', '', $phone);

        $response = Http::withToken(config('services.whatsapp.token'))
            ->post(
                'https://graph.facebook.com/' . config('services.whatsapp.version', 'v23.0') . '/' . config('services.whatsapp.phone_number_id') . '/messages',
                [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $cleanPhone,
                    'type' => 'text',
                    'text' => [
                        'preview_url' => false,
                        'body' => $message,
                    ],
                ]
            );

        return $response->json();
    }

    /**
     * Send a template message (required for initiating conversations outside 24h window)
     */
    public function sendTemplate(string $phone, string $templateName, string $languageCode = 'en_US', array $components = [])
    {
        $cleanPhone = preg_replace('/\D/', '', $phone);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $cleanPhone,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $languageCode,
                ],
            ],
        ];

        if (!empty($components)) {
            $payload['template']['components'] = $components;
        }

        $response = Http::withToken(config('services.whatsapp.token'))
            ->post(
                'https://graph.facebook.com/' . config('services.whatsapp.version', 'v23.0') . '/' . config('services.whatsapp.phone_number_id') . '/messages',
                $payload
            );

        return $response->json();
    }

    /**
     * Send a template message with a body text parameter and a dynamic URL button parameter.
     */
    public function sendLinkButtonTemplate(string $phone, string $templateName, string $languageCode, string $bodyText, string $buttonUrlSuffix)
    {
        $components = [
            [
                'type' => 'body',
                'parameters' => [
                    [
                        'type' => 'text',
                        'text' => $bodyText,
                    ]
                ]
            ],
            [
                'type' => 'button',
                'sub_type' => 'url',
                'index' => '0',
                'parameters' => [
                    [
                        'type' => 'text',
                        'text' => $buttonUrlSuffix,
                    ]
                ]
            ]
        ];

        return $this->sendTemplate($phone, $templateName, $languageCode, $components);
    }
}

