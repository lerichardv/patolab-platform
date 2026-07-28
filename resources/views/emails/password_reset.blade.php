@extends('emails.layout')

@section('content')
    <h2 style="color: #1e3a8a; margin-top: 0; font-size: 22px;">Restablecer Contraseña</h2>
    
    <p>Hola,</p>
    
    <p>Recibió este correo electrónico porque recibimos una solicitud de restablecimiento de contraseña para su cuenta en PatoLab.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $resetUrl }}" class="btn" style="color: #ffffff; text-decoration: none;">Restablecer Contraseña</a>
    </div>
    
    <p>Este enlace para restablecer la contraseña expirará en {{ $expire }} minutos.</p>
    
    <p>Si no realizó esta solicitud, no es necesario realizar ninguna otra acción.</p>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 30px;">Si no puede ver el botón anterior, copie y pegue la siguiente dirección URL en su navegador web: <br>
    <a href="{{ $resetUrl }}" style="color: #2563eb; word-break: break-all;">{{ $resetUrl }}</a></p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong></p>
@endsection
