<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de Compra - {{ $order->code }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', sans-serif;
            font-size: 11px;
            color: #333333;
            line-height: 1.3;
            padding: 10px;
            background-color: #ffffff;
        }

        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }

        .logo-section {
            width: 60%;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .logo-img {
            max-width: 200px;
            height: auto;
            margin-bottom: 8px;
        }

        .company-details {
            font-size: 10px;
            color: #4b5563;
        }

        .company-details p {
            margin-bottom: 2px;
        }

        .order-title-box {
            width: 35%;
            border: 2px solid #0f172a;
            border-radius: 4px;
            overflow: hidden;
            text-align: center;
        }

        .order-title-header {
            background-color: #cbd5e1;
            color: #0f172a;
            font-size: 12px;
            font-weight: 700;
            padding: 6px;
            text-transform: uppercase;
        }

        .order-title-body {
            padding: 8px;
            font-size: 10px;
        }

        .order-title-body table {
            width: 100%;
            border-collapse: collapse;
        }

        .order-title-body td {
            padding: 2px;
        }

        .order-title-body td.label {
            font-weight: 700;
            text-align: left;
        }

        .order-title-body td.value {
            text-align: right;
            font-family: monospace;
        }

        .section-bar {
            background-color: #cbd5e1;
            color: #0f172a;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            text-transform: uppercase;
            margin-bottom: 8px;
            margin-top: 15px;
            text-align: center;
        }

        .provider-details {
            padding: 4px 8px;
            font-size: 11px;
            color: #1f2937;
            line-height: 1.4;
        }

        .provider-details .provider-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 3px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .items-table th {
            background-color: #cbd5e1;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            padding: 6px;
            border: 1px solid #94a3b8;
            text-align: left;
        }

        .items-table td {
            padding: 6px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
        }

        .items-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .footer-signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 10px;
        }

        .signature-col {
            width: 45%;
            text-align: center;
        }

        .signature-line {
            border-top: 1.5px solid #000000;
            margin-top: 40px;
            padding-top: 5px;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
        }

        .authorized-text {
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="header-container">
        <div class="logo-section">
            <img class="logo-img" src="{{ public_path('images/patolab-logo-horizontal.png') }}" alt="Logo PatoLab">
            <div class="company-details">
                <p>Barrio. Los Andes, 7 calle NO, 12-13 Avenida</p>
                <p>San Pedro Sula, Honduras C.A. TEL: 2510-6502 WHATSAPP: 9442-9419</p>
            </div>
        </div>
        <div class="order-title-box">
            <div class="order-title-header">Orden de Compra</div>
            <div class="order-title-body">
                <table>
                    <tr>
                        <td class="label">Código:</td>
                        <td class="value">{{ strtoupper($order->code) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Fecha:</td>
                        <td class="value">{{ $order->date_requested->format('d/m/Y') }}</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <div class="section-bar">Proveedor</div>
    <div class="provider-details">
        <div class="provider-name">{{ $order->provider->name }}</div>
        <p>{{ $order->provider->address }} / TEL: {{ $order->provider->phone }} @if($order->provider->phone2) / CEL: {{ $order->provider->phone2 }} @endif</p>
        <p>E-mail: {{ $order->provider->email }}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 8%; text-align: center;">Item</th>
                <th style="width: 15%;">Código</th>
                <th style="width: 47%;">Producto</th>
                <th style="width: 20%;">Presentación</th>
                <th style="width: 10%; text-align: center;">Cantidad</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->products as $index => $item)
                <tr>
                    <td style="text-align: center;">{{ $index + 1 }}</td>
                    <td style="font-family: monospace;">{{ $item->product->code }}</td>
                    <td style="font-weight: 500;">{{ $item->product->name }}</td>
                    <td>{{ $item->specification }}</td>
                    <td style="text-align: center; font-weight: bold;">{{ $item->quantity }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div style="margin-top: 30px;">
        <p class="authorized-text">AUTORIZADO POR:</p>
    </div>

    <div class="footer-signatures">
        <div class="signature-col">
            <div class="signature-line">Nombre del Solicitante</div>
        </div>
        <div class="signature-col">
            <div class="signature-line">Firma Autorización</div>
        </div>
    </div>
</body>
</html>
