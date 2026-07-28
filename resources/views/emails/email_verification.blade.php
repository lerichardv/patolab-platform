@extends('emails.layout')

@section('content')
    <h2 style="color: #1e3a8a; margin-top: 0; font-size: 22px;">Verificar Dirección de Correo</h2>
    
    <p>Hola,</p>
    
    <p>Haga clic en el botón a continuación para verificar su dirección de correo electrónico en PatoLab.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $verificationUrl }}" class="btn" style="color: #ffffff; text-decoration: none;">Verificar Correo Electrónico</a>
    </div>
    
    <p>Si no creó una cuenta, no es necesario realizar ninguna otra acción.</p>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 30px;">Si no puede ver el botón anterior, copie y pegue la siguiente dirección URL en su navegador web: <br>
    <a href="{{ $verificationUrl }}" style="color: #2563eb; word-break: break-all;">{{ $verificationUrl }}</a></p>
    
    <p>Atentamente,<br><strong>El equipo de PatoLab</strong></p>
@endsection
