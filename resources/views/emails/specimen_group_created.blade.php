@extends('emails.layout')

@section('content')
    <h2 style="color: #1e3a8a; margin-top: 0; font-size: 22px;">¡Registro Exitoso de Grupo de Muestras!</h2>
    
    <p>Hola, <strong>{{ $customer->name }}</strong>,</p>
    
    <p>Le informamos que su grupo de muestras ha sido registrado exitosamente en nuestro sistema. Nuestro equipo de patólogos ya está trabajando en su análisis.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #475569; margin-top: 0; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Resumen de Muestras en el Grupo</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid #e2e8f0; color: #475569;">
                    <th style="padding: 8px 4px; font-weight: 600;">Código</th>
                    <th style="padding: 8px 4px; font-weight: 600;">Paciente</th>
                    <th style="padding: 8px 4px; font-weight: 600;">Tipo</th>
                    <th style="padding: 8px 4px; font-weight: 600;">Examen / Análisis</th>
                </tr>
            </thead>
            <tbody>
                @foreach($group->specimens as $specimen)
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 4px; font-family: monospace; font-weight: bold; color: #0f172a;">{{ $specimen->sequence_code }}</td>
                        <td style="padding: 10px 4px; color: #334155;">{{ $specimen->customerRelation?->name ?? 'N/A' }}</td>
                        <td style="padding: 10px 4px; color: #64748b;">{{ $specimen->type?->name ?? 'N/A' }}</td>
                        <td style="padding: 10px 4px; color: #64748b;">{{ $specimen->examination?->name ?? 'N/A' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    
    <p>Puede realizar el seguimiento en tiempo real del progreso de este grupo de muestras haciendo clic en el siguiente enlace:</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $statusUrl }}" class="btn" style="color: #ffffff; text-decoration: none;">Ver Estado en Tiempo Real</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 30px;">Si no puede ver el botón anterior, copie y pegue la siguiente dirección URL en su navegador web: <br>
    <a href="{{ $statusUrl }}" style="color: #2563eb; word-break: break-all;">{{ $statusUrl }}</a></p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong></p>
@endsection
