<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiAssistantController extends Controller
{
    public function chat(Request $request)
    {
        Gate::authorize('ai_assistant.view');

        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|string|in:user,assistant,system',
            'messages.*.content' => 'required|string',
        ]);

        $apiKey = env('OPENAI_API_KEY');

        if (empty($apiKey)) {
            return response()->json([
                'error' => 'La clave API de OpenAI no está configurada.',
            ], 500);
        }

        // Add the system prompt to guide the assistant
        $systemPrompt = [
            'role' => 'system',
            'content' => "Eres PatoLab AI, un asistente virtual experto para la plataforma de laboratorio de patología PatoLab.\n".
                'Ayudas a los usuarios (patólogos, técnicos, administrativos) con preguntas sobre el uso del sistema, conceptos médicos de patología o asistencia general. '.
                "Tus respuestas deben ser en español, profesionales, cortas, concisas, bien formateadas (usando markdown si es necesario) y sumamente útiles.\n\n".
                "Contexto de la plataforma:\n".
                "- PatoLab es un sistema de gestión para laboratorios de patología.\n".
                "- Los patólogos diagnostican muestras (Specimens) y redactan reportes (SpecimenReports).\n".
                "- Las muestras pasan por estados (recibida, en proceso, completada, etc.) y tienen prioridades.\n".
                "- Los técnicos patólogos procesan órdenes de trabajo (Work Orders).\n".
                "- Hay módulos de facturación, almacenes/inventario y control de clientes.\n\n".
                'Responde siempre con amabilidad y eficiencia.',
        ];

        $messages = $request->input('messages');
        array_unshift($messages, $systemPrompt);

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])
                ->withToken($apiKey)
                ->timeout(30)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => $messages,
                    'temperature' => 0.7,
                ]);

            if ($response->failed()) {
                Log::error('OpenAI API request failed: '.$response->body());

                return response()->json([
                    'error' => 'Error al comunicarse con el servicio de IA. Código: '.$response->status(),
                ], 502);
            }

            $responseData = $response->json();
            $reply = $responseData['choices'][0]['message']['content'] ?? '';

            return response()->json([
                'reply' => $reply,
            ]);

        } catch (\Exception $e) {
            Log::error('Exception during OpenAI request: '.$e->getMessage());

            return response()->json([
                'error' => 'Error al procesar la solicitud: '.$e->getMessage(),
            ], 500);
        }
    }
}
