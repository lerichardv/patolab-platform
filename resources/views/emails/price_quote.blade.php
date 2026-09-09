@extends('emails.layout')

@section('content')
    <h2 style="color: #1e3a8a; margin-top: 0; font-size: 22px;">Cotización #{{ $priceQuote->price_quote_id }}</h2>
    
    <p>Hola, <strong>{{ $customerName }}</strong>,</p>
    
    <p>Le compartimos el presupuesto detallado emitido por <strong>PatoLab</strong> para los análisis solicitados. A continuación encontrará un resumen del documento:</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #475569; margin-top: 0; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Detalles de la Cotización</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Nº Cotización:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold;">#{{ $priceQuote->price_quote_id }}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Fecha de Emisión:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">{{ ($priceQuote->created_at ?? now())->format('d/m/Y h:i A') }}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Validez:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">30 Días calendario</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Total Cotizado:</strong></td>
                <td style="padding: 6px 0; color: #1e3a8a; font-size: 16px; font-weight: 800;">L. {{ number_format((float)$priceQuote->total, 2) }}</td>
            </tr>
        </table>
    </div>

    @if(!empty($customMessage))
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 12px 16px; margin: 20px 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
            <strong>Nota:</strong><br>
            {{ $customMessage }}
        </div>
    @endif

    <div style="background-color: #f0fdf4; border: 1px dashed #22c55e; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #166534;">
        📎 <strong>Archivo adjunto:</strong> El documento formal de la cotización en formato PDF ha sido adjuntado a este correo electrónico para su descarga e impresión.
    </div>

    @if($priceQuote->price_quote_url)
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $priceQuote->price_quote_url }}" class="btn" style="color: #ffffff; text-decoration: none;">Ver / Descargar Cotización PDF</a>
        </div>
    @endif
    
    <p style="font-size: 13px; color: #64748b; margin-top: 25px;">
        Nuestro horario de atención es de lunes a viernes, de 8:00am a 5:00pm y los sábados de 8:00am a 12:00m.<br>
        Agradecemos que nos haya elegido y esperamos atenderle.
    </p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong><br><span style="font-size: 12px; color: #64748b;">Calidad Diagnóstica A Su Servicio</span></p>
@endsection
