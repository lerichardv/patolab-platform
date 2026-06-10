<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    /**
     * Handles Meta's initial Webhook Verification (GET Request)
     */
    public function verify(Request $request)
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        // Check if the mode and token match your config secret
        if ($mode === 'subscribe' && $token === env('WHATSAPP_VERIFY_TOKEN')) {
            Log::info('WhatsApp Webhook verified successfully!');

            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        Log::warning("WhatsApp Webhook verification failed! Mode: {$mode}, Token: {$token}");

        return response('Unauthorized', 403);
    }

    /**
     * Handles actual incoming WhatsApp messages and delivery statuses (POST Request)
     */
    public function handleIncoming(Request $request)
    {
        $payload = $request->all();

        // Log the entire raw payload for reference
        Log::info('WhatsApp Webhook Raw Payload:', $payload);

        // Check if this is a status update event (sent, delivered, read, failed)
        if (isset($payload['entry'][0]['changes'][0]['value']['statuses'])) {
            $statuses = $payload['entry'][0]['changes'][0]['value']['statuses'];
            foreach ($statuses as $status) {
                $msgId = $status['id'] ?? 'unknown_id';
                $statusName = $status['status'] ?? 'unknown_status';
                $recipient = $status['recipient_id'] ?? 'unknown_recipient';

                $logMsg = "WhatsApp Message Status Update - ID: {$msgId}, Status: {$statusName}, Recipient: {$recipient}";

                if (isset($status['errors'])) {
                    $logMsg .= ', Errors: '.json_encode($status['errors']);
                    Log::error($logMsg);
                } else {
                    Log::info($logMsg);
                }
            }
        }

        // Check if this is an incoming message event (user texts the bot)
        if (isset($payload['entry'][0]['changes'][0]['value']['messages'])) {
            $messages = $payload['entry'][0]['changes'][0]['value']['messages'];
            foreach ($messages as $message) {
                $from = $message['from'] ?? 'unknown_sender';
                $msgId = $message['id'] ?? 'unknown_id';
                $type = $message['type'] ?? 'text';

                $body = '';
                if ($type === 'text' && isset($message['text']['body'])) {
                    $body = $message['text']['body'];
                }

                Log::info("WhatsApp Incoming Message - From: {$from}, ID: {$msgId}, Type: {$type}, Body: {$body}");
            }
        }

        // Always return a 200 OK status to let Meta know you received it safely
        return response('EVENT_RECEIVED', 200);
    }
}
