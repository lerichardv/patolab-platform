<?php

use App\Http\Controllers\Api\WhatsAppWebhookController;
use App\Http\Controllers\Editor\ReportEditorController;
use Illuminate\Support\Facades\Route;

Route::get('/whatsapp/webhook', [WhatsAppWebhookController::class, 'verify']);
Route::post('/whatsapp/webhook', [WhatsAppWebhookController::class, 'handleIncoming']);
Route::post('/collaboration', [ReportEditorController::class, 'handleWebhook']);
