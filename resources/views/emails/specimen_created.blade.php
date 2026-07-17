@extends('emails.layout')

@section('content')
    <h2 style="color: #1e3a8a; margin-top: 0; font-size: 22px;">¡Registro Exitoso de Muestra!</h2>
    
    <p>Hola, <strong>{{ $customer->name }}</strong>,</p>
    
    <p>Le informamos que su muestra ha sido registrada exitosamente en nuestro sistema. Nuestro equipo de patólogos ya está trabajando en su análisis.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #475569; margin-top: 0; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Detalles de la Muestra</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Código de Muestra:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold;">{{ $specimen->sequence_code }}</td>
            </tr>
            @if($specimen->type)
            <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Tipo de Espécimen:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">{{ $specimen->type->name }}</td>
            </tr>
            @endif
            @if($specimen->examination)
            <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Examen / Análisis:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">{{ $specimen->examination->name }}</td>
            </tr>
            @endif
            <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Fecha de Registro:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">{{ $specimen->created_at->format('d/m/Y h:i A') }}</td>
            </tr>
        </table>
    </div>
    
    <p>Puede realizar el seguimiento en tiempo real del progreso de su análisis haciendo clic en el siguiente enlace:</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $statusUrl }}" class="btn" style="color: #ffffff; text-decoration: none;">Ver Estado en Tiempo Real</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 30px;">Si no puede ver el botón anterior, copie y pegue la siguiente dirección URL en su navegador web: <br>
    <a href="{{ $statusUrl }}" style="color: #2563eb; word-break: break-all;">{{ $statusUrl }}</a></p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong></p>
@endsection
