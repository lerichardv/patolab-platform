@extends('emails.layout')

@section('content')
    <h2 style="color: #16a34a; margin-top: 0; font-size: 22px;">¡Su Reporte está Listo!</h2>
    
    <p>Hola, <strong>{{ $customer->name }}</strong>,</p>
    
    <p>Le informamos que el análisis de su muestra con código <strong>{{ $specimen->sequence_code }}</strong> ha finalizado. Los patólogos han emitido el reporte correspondiente.</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0; color: #166534;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 15px;"><strong>Reporte Adjunto</strong></h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">Hemos adjuntado una copia del reporte oficial en formato PDF a este correo electrónico para su comodidad.</p>
    </div>
    
    <p>También puede visualizar los resultados del diagnóstico y el historial de progreso de su muestra en tiempo real a través de nuestro portal digital:</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $statusUrl }}" class="btn" style="background-color: #16a34a; color: #ffffff; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);">Ver Reporte y Estado en Portal</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 30px;">Si no puede ver el botón anterior, copie y pegue la siguiente dirección URL en su navegador web: <br>
    <a href="{{ $statusUrl }}" style="color: #16a34a; word-break: break-all;">{{ $statusUrl }}</a></p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong></p>
@endsection
