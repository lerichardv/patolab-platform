@extends('emails.layout')

@section('content')
    <h2 style="color: #1e3a8a; margin-top: 0; font-size: 22px;">Bienvenido al Portal de Clientes — PatoLab</h2>
    
    <p>Estimado(a) <strong>{{ $customer->name }}</strong>,</p>
    
    <p>Se ha habilitado su acceso al Portal de Clientes y Pacientes de PatoLab, donde podrá consultar el estado de sus estudios clínicos y descargar sus reportes diagnósticos de manera segura.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong>Sus credenciales de acceso:</strong></p>
        <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Correo electrónico:</strong> <span style="color: #1e293b;">{{ $customer->email }}</span></p>
        @if(!empty($password))
            <p style="margin: 0; font-size: 14px;"><strong>Contraseña:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{{ $password }}</span></p>
        @endif
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $loginUrl }}" class="btn" style="color: #ffffff; text-decoration: none;">Ingresar al Portal</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Por motivos de seguridad, le recomendamos cambiar su contraseña tras iniciar sesión por primera vez desde la sección de Ajustes de su cuenta.</p>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Dirección de acceso al portal: <br>
    <a href="{{ $loginUrl }}" style="color: #2563eb; word-break: break-all;">{{ $loginUrl }}</a></p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong></p>
@endsection
