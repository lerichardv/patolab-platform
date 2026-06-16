<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura de Abono {{ $invoice->full_invoice_number }}</title>
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
            margin-bottom: 12px;
        }

        .logo-section {
            width: 68%;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .logo-img {
            max-width: 240px;
            height: auto;
        }

        .info-section {
            width: 100%;
            text-align: left;
            padding: 0;
            margin-top: 4px;
        }

        .company-name {
            font-size: 11px;
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 2px;
        }

        .company-details {
            font-size: 9px;
            color: #4b5563;
        }

        .factura-box {
            width: 28%;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            overflow: hidden;
        }

        .factura-box-header {
            background-color: #3b82f6;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            text-align: center;
            padding: 6px;
        }

        .factura-box-body {
            padding: 8px;
            font-size: 9px;
        }

        .factura-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .factura-row span:first-child {
            font-weight: 600;
        }

        .cliente-section {
            margin-bottom: 12px;
        }

        .section-header {
            background-color: #3b82f6;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            text-align: center;
            padding: 3px;
            border-radius: 4px;
            margin-bottom: 4px;
        }

        .cliente-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
            padding: 5px 10px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background-color: #f9fafb;
        }

        .cliente-grid.has-specimen {
            border-color: #bfdbfe;
            background-color: #eff6ff;
        }

        .cliente-item {
            font-size: 10px;
        }

        .cliente-item strong {
            font-weight: 600;
            color: #374151;
        }

        .table-section {
            margin-bottom: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }

        th {
            background-color: #f59e0b;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 5px;
            font-size: 10px;
        }

        td {
            padding: 5px;
            border-bottom: 1px solid #e5e7eb;
        }

        .text-right {
            text-align: right;
        }

        .totals-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 8px;
        }

        .totals-left {
            width: 55%;
            font-size: 10px;
            font-weight: 600;
            color: #1f2937;
            padding-top: 5px;
        }

        .totals-right {
            width: 40%;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            margin-bottom: 2px;
            color: #4b5563;
        }

        .total-row.final-total {
            font-size: 13px;
            font-weight: 700;
            color: #000000;
            border-top: 1px solid #374151;
            padding-top: 4px;
            margin-top: 4px;
        }

        .footer-section {
            margin-top: 15px;
            font-size: 9px;
            color: #6b7280;
            position: relative;
        }

        .exigela-text {
            font-weight: 600;
            margin-bottom: 4px;
        }

        .correlatives {
            margin-bottom: 8px;
        }

        .correlative-item {
            margin-bottom: 2px;
        }

        .stamp-container {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 15px;
            align-items: center;
        }

        .pagado-stamp {
            border: 3px double #10b981;
            color: #10b981;
            font-size: 24px;
            font-weight: 800;
            padding: 4px 15px;
            border-radius: 4px;
            transform: rotate(-5deg);
            letter-spacing: 2px;
            opacity: 0.85;
        }

        .round-seal {
            width: 110px;
            height: auto;
            opacity: 0.8;
        }

        .original-copia {
            text-align: center;
            font-size: 9px;
            font-weight: 600;
            margin-top: 20px;
            color: #374151;
        }

        .tagline {
            text-align: center;
            font-style: italic;
            font-size: 11px;
            font-weight: 600;
            color: #1e3a8a;
            margin-top: 15px;
        }

        .specimen-title {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #3b82f6;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
        }

        .specimen-value {
            font-size: 12px;
            font-weight: 600;
            color: #1e3a8a;
        }

        .specimen-code-badge {
            font-family: monospace;
            font-size: 13px;
            font-weight: 800;
            color: #1e3a8a;
            display: inline-block;
        }

        .credit-info-box {
            margin-top: 8px;
            padding: 6px;
            border: 1px dashed #3b82f6;
            border-radius: 6px;
            background-color: #f0f7ff;
            font-size: 9.5px;
        }

        .credit-info-title {
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 3px;
            text-transform: uppercase;
        }

        .credit-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
    </style>
</head>
<body>

    <div class="header-container">
        <div class="logo-section">
            @if(file_exists(public_path('images/patolab-logo-horizontal.png')))
                <img class="logo-img" src="{{ public_path('images/patolab-logo-horizontal.png') }}" alt="Logo PatoLab">
            @else
                <div style="font-size: 20px; font-weight: 800; color: #1e3a8a;">PatoLab</div>
            @endif
            <div class="info-section">
                <div class="company-name">Castro Urbina Y Asociados S. De R.L.</div>
                <div class="company-details">
                    Barrio los Andes: 7, 12-13 Calle Avenida, Sector N.O., Casa NO.: 105, Departamento: Cortes, Municipio: San Pedro Sula<br>
                    Teléfono: 25106502 | Celular: 94428529<br>
                    Correo: info@patolab.org
                </div>
            </div>
        </div>
        <div class="factura-box">
            <div class="factura-box-header">Abono Factura</div>
            <div class="factura-box-body">
                <div class="factura-row">
                    <span>Nº Factura:</span>
                    <span>{{ $invoice->full_invoice_number }}</span>
                </div>
                <div class="factura-row">
                    <span>Fecha:</span>
                    <span>{{ $invoice->created_at->format('d/m/Y h:i a') }}</span>
                </div>
                <div class="factura-row" style="flex-direction: column;">
                    <span style="margin-bottom: 1px;">CAI:</span>
                    <span style="font-size: 7.5px; word-break: break-all; color: #4b5563;">{{ $caiRange->cai }}</span>
                </div>
                <div class="factura-row">
                    <span>RTN:</span>
                    <span>{{ $location->rtn }}</span>
                </div>
                <div class="factura-row" style="flex-direction: column;">
                    <span>Rango Autorizado:</span>
                    <span style="color: #4b5563;">
                        Desde: {{ $caiRange->full_prefix . str_pad($caiRange->start_number, 8, '0', STR_PAD_LEFT) }}<br>
                        Hasta: {{ $caiRange->full_prefix . str_pad($caiRange->end_number, 8, '0', STR_PAD_LEFT) }}
                    </span>
                </div>
                <div class="factura-row">
                    <span>Fecha Activación:</span>
                    <span>{{ \Carbon\Carbon::parse($caiRange->created_at)->format('Y-m-d') }}</span>
                </div>
                <div class="factura-row">
                    <span>Fecha Límite:</span>
                    <span>{{ \Carbon\Carbon::parse($caiRange->deadline)->format('Y-m-d') }}</span>
                </div>
                <div class="factura-row">
                    <span>Factura:</span>
                    <span style="text-transform: capitalize;">{{ $invoice->payment_type === 'check' ? 'Cheque' : 'Contado' }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="cliente-section">
        <div class="section-header">
            @if($originalInvoice && $originalInvoice->specimen && $originalInvoice->specimen->sequence_code)
                Cliente y Muestra Original
            @else
                Cliente
            @endif
        </div>
        <div class="cliente-grid {{ $originalInvoice && $originalInvoice->specimen && $originalInvoice->specimen->sequence_code ? 'has-specimen' : '' }}">
            @if($originalInvoice && $originalInvoice->specimen && $originalInvoice->specimen->sequence_code)
                <div style="grid-column: span 2; display: flex; flex-direction: column; align-items: flex-start;">
                    <span class="specimen-title">Código de Muestra</span>
                    <span class="specimen-code-badge">{{ $originalInvoice->specimen->sequence_code }}</span>
                    <span style="font-size: 10px; color: #4b5563; margin-top: 2px;">
                        {{ $originalInvoice->specimen->type->name }}
                        @if($originalInvoice->specimen->examination)
                            - {{ $originalInvoice->specimen->examination->name }}
                        @endif
                    </span>
                </div>
                <div style="text-align: right; align-self: center; display: flex; flex-direction: column; align-items: flex-end;">
                    <span class="specimen-title">Fecha estimada del resultado</span>
                    <span class="specimen-value" style="font-size: 13px; font-weight: 800; color: #1e3a8a;">
                        {{ $originalInvoice->specimen->expected_finalization_date ? $originalInvoice->specimen->expected_finalization_date->format('d/m/Y h:i a') : 'N/A' }}
                    </span>
                </div>
                <div style="grid-column: span 3; border-top: 1px solid #bfdbfe; margin: 4px 0;"></div>
            @endif

            <div class="cliente-item" style="grid-column: span 3; margin-top: 2px;">
                <strong>Nombre:</strong> {{ $customer->name }}
            </div>
            <div class="cliente-item">
                <strong>ID/RTN:</strong> {{ $customer->id_number }}
            </div>
            <div class="cliente-item">
                <strong>Teléfono:</strong> {{ $customer->phone ?? '0' }}
            </div>
            <div class="cliente-item">
                @if(!empty($customer->email))
                    <strong>Correo:</strong> {{ $customer->email }}
                @endif
            </div>
        </div>
    </div>

    <div class="table-section">
        <table>
            <thead>
                <tr>
                    <th style="width: 8%">Nº</th>
                    <th style="width: 50%">Nombre Producto / Servicio</th>
                    <th style="width: 10%">Cantidad</th>
                    <th style="width: 10%" class="text-right">Precio</th>
                    <th style="width: 10%" class="text-right">Descuento</th>
                    <th style="width: 12%" class="text-right">Importe</th>
                </tr>
            </thead>
            <tbody>
                @if($credit->is_group && !empty($paidSpecimens) && count($paidSpecimens) > 0)
                    @foreach($paidSpecimens as $index => $spec)
                        @php
                            $detail = DB::table('credit_invoice_specimens')
                                ->where('credit_id', $credit->id)
                                ->where('specimen_id', $spec->id)
                                ->first();
                            $specTotal = $detail ? (float)$detail->total : 0.00;
                        @endphp
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>
                                <div style="font-weight: bold; font-size: 10.5px; color: #1f2937;">Abono a Crédito - Muestra: <span style="font-family: monospace; font-weight: bold; color: #1e3a8a; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 3px;">{{ $spec->sequence_code }}</span></div>
                                <div style="font-size: 8.5px; color: #4b5563; margin-top: 3px;">
                                    Paciente: <strong>{{ $spec->customerRelation->name }}</strong> &nbsp;|&nbsp;
                                    {{ $spec->type->name }}
                                    @if($spec->examination)
                                        - {{ $spec->examination->name }}
                                    @endif
                                </div>
                            </td>
                            <td>1</td>
                            <td class="text-right">L. {{ number_format($specTotal, 2) }}</td>
                            <td class="text-right">L. 0.00</td>
                            <td class="text-right">L. {{ number_format($specTotal, 2) }}</td>
                        </tr>
                    @endforeach
                @else
                    <tr>
                        <td>1</td>
                        <td>
                            <div style="font-weight: bold; font-size: 10.5px; color: #1f2937;">Abono a Crédito Pendiente</div>
                            <div style="font-size: 8.5px; color: #4b5563; margin-top: 3px;">
                                @if($originalInvoice && $originalInvoice->specimen && $originalInvoice->specimen->sequence_code)
                                    Muestra: <span style="font-family: monospace; font-weight: bold; color: #1e3a8a; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 3px;">{{ $originalInvoice->specimen->sequence_code }}</span> &nbsp;|&nbsp;
                                @endif
                                Factura de Crédito Original: <strong>{{ $originalInvoice->full_invoice_number }}</strong>
                            </div>
                            @if($originalInvoice && $originalInvoice->age_discount_type)
                                <div style="font-size: 8.5px; color: #10b981; margin-top: 3px; font-weight: 500;">
                                    * Factura original con Descuento de {{ $originalInvoice->age_discount_type === 'third' ? 'Tercera Edad' : 'Cuarta Edad' }} (- L. {{ number_format($originalInvoice->age_discount_amount, 2) }})
                                </div>
                            @endif
                        </td>
                        <td>1</td>
                        <td class="text-right">L. {{ number_format($invoice->amount, 2) }}</td>
                        <td class="text-right">L. 0.00</td>
                        <td class="text-right">L. {{ number_format($invoice->amount, 2) }}</td>
                    </tr>
                @endif
            </tbody>
        </table>
    </div>

    <div class="totals-section">
        <div class="totals-left">
            {{ $totalWords }}

            <div class="credit-info-box">
                <div class="credit-info-title">Estado de Cuenta de Crédito</div>
                <div class="credit-info-row">
                    <span>Monto de Crédito Original:</span>
                    <strong>L. {{ number_format($credit->credit_amount, 2) }}</strong>
                </div>
                <div class="credit-info-row">
                    <span>Abono realizado en esta Transacción:</span>
                    <strong style="color: #10b981;">L. {{ number_format($invoice->amount, 2) }}</strong>
                </div>
                <div class="credit-info-row">
                    <span>Abonos anteriores acumulados:</span>
                    <strong>L. {{ number_format($credit->amount_paid - $invoice->amount, 2) }}</strong>
                </div>
                <div class="credit-info-row" style="border-top: 1px dashed #3b82f6; margin-top: 4px; padding-top: 4px;">
                    <span>Nuevo Saldo Pendiente:</span>
                    <strong style="color: {{ $credit->amount_remaining > 0 ? '#ef4444' : '#10b981' }};">L. {{ number_format($credit->amount_remaining, 2) }}</strong>
                </div>
            </div>
        </div>
        <div class="totals-right">
            <div class="total-row">
                <span>Importe:</span>
                <span>L. {{ number_format($invoice->amount, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Descuentos y Rebajas Otorgados:</span>
                <span>L. 0.00</span>
            </div>
            <div class="total-row">
                <span>Sub-Total:</span>
                <span>L. {{ number_format($invoice->subtotal, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Importe Exonerado:</span>
                <span>L. {{ number_format($invoice->tax_exempt_amount, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Importe Exento:</span>
                <span>L. 0.00</span>
            </div>
            <div class="total-row">
                <span>Importe Gravado 15%:</span>
                <span>L. 0.00</span>
            </div>
            <div class="total-row">
                <span>Importe Gravado 18%:</span>
                <span>L. 0.00</span>
            </div>
            <div class="total-row">
                <span>ISV 15%:</span>
                <span>L. 0.00</span>
            </div>
            <div class="total-row">
                <span>ISV 18%:</span>
                <span>L. 0.00</span>
            </div>
            <div class="total-row final-total">
                <span>Total Recibido:</span>
                <span>L. {{ number_format($invoice->total, 2) }}</span>
            </div>
        </div>
    </div>

    <div class="footer-section">
        <div class="exigela-text">La factura es beneficio de todos "Exíjala"</div>
        <div class="correlatives">
            <div class="correlative-item">Nº correlativo de orden de compra exenta _________________________</div>
            <div class="correlative-item">Nº correlativo constancia de registro Exonerado ___________________</div>
            <div class="correlative-item">Nº identificativo del registro de la SAG ________________________</div>
        </div>

        <div class="stamp-container">
            @if(file_exists(public_path('images/sello.png')))
                <img class="round-seal" src="{{ public_path('images/sello.png') }}" alt="Sello PatoLab">
            @endif

            <div class="pagado-stamp">PAGADO</div>
        </div>

        <div class="original-copia">
            Original: Cliente &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Copia: Emisor
        </div>
        <div class="tagline">Calidad Diagnóstica A Su Servicio</div>
    </div>

</body>
</html>
