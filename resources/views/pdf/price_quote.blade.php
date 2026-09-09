<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización #{{ $priceQuote->price_quote_id }}</title>
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
            max-width: 280px;
            height: auto;
            margin-bottom: 10px;
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
            color: #1e3a8a;
            font-size: 18px;
            font-weight: 800;
            text-align: center;
            padding: 8px 6px 2px 6px;
            letter-spacing: 0.5px;
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

        .saludo-section {
            margin-bottom: 12px;
            font-size: 12px;
            line-height: 1.5;
            color: #374151;
        }

        .saludo-recipient {
            margin-bottom: 5px;
            font-size: 12.5px;
            font-weight: 600;
            color: #1f2937;
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
            margin-top: 12px;
            font-size: 9px;
            color: #6b7280;
            position: relative;
            page-break-inside: avoid;
        }

        .disclaimer-text {
            font-size: 8px;
            color: #6b7280;
            line-height: 1.3;
            margin-bottom: 6px;
            text-align: justify;
        }

        .closing-section {
            margin-top: 10px;
            font-size: 11.5px;
            color: #374151;
            line-height: 1.5;
        }

        .schedule-note {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin-bottom: 8px;
            color: #374151;
            font-size: 11.5px;
        }

        .bullet-circle {
            font-size: 11px;
            color: #4b5563;
            line-height: 1;
        }

        .gratitude-note {
            margin-bottom: 10px;
            color: #374151;
            font-size: 11.5px;
        }

        .atentamente-block {
            margin-top: 8px;
            margin-bottom: 8px;
            display: flex;
            align-items: baseline;
            gap: 6px;
        }

        .atentamente-label {
            font-weight: 500;
            color: #374151;
            font-size: 11.5px;
        }

        .atentamente-signer {
            font-weight: 700;
            font-size: 13.5px;
            color: #1e3a8a;
        }

        .stamp-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 30px;
            margin-top: 10px;
            width: 100%;
        }

        .cotizacion-stamp {
            border: 3px double #3b82f6;
            color: #3b82f6;
            font-size: 22px;
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
            opacity: 0.85;
        }

        .original-copia {
            text-align: center;
            font-size: 9px;
            font-weight: 600;
            margin-top: 14px;
            color: #374151;
        }

        .tagline {
            text-align: center;
            font-style: italic;
            font-size: 11px;
            font-weight: 600;
            color: #1e3a8a;
            margin-top: 8px;
        }
    </style>
</head>
<body>

    <div class="header-container">
        <div class="logo-section">
            @if(file_exists(public_path('images/patolab-logo-horizontal-full.png')))
                <img class="logo-img" src="{{ public_path('images/patolab-logo-horizontal-full.png') }}" alt="Logo PatoLab">
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
            <div class="factura-box-header">Cotización</div>
            <div class="factura-box-body">
                <div class="factura-row">
                    <span>Nº Cotización:</span>
                    <span style="font-family: monospace; font-weight: 700;">#{{ $priceQuote->price_quote_id }}</span>
                </div>
                <div class="factura-row">
                    <span>Fecha:</span>
                    <span>{{ ($priceQuote->created_at ?? now())->format('d/m/Y h:i a') }}</span>
                </div>
                <div class="factura-row">
                    <span>RTN:</span>
                    <span>{{ $location->rtn ?? '05019017124976' }}</span>
                </div>
                <div class="factura-row">
                    <span>Validez:</span>
                    <span>30 Días</span>
                </div>
            </div>
        </div>
    </div>

    <div class="saludo-section">
        <div class="saludo-recipient">
            @if(!empty($customer?->name) && !in_array(trim($customer->name), ['Consumidor Final', 'Público General', 'N/A', '']))
                Estimado {{ $customer->name }},
            @else
                Estimado cliente,
            @endif
        </div>
        <div>
            Tenemos el gusto de responder a su solicitud. A continuación, le mostramos en detalle los análisis solicitados:
        </div>
    </div>

    <div class="cliente-section">
        <div class="section-header">
            Datos del Cliente
        </div>
        <div class="cliente-grid">
            <div class="cliente-item" style="grid-column: span 3; margin-top: 2px;">
                <strong>Nombre / Razón Social:</strong> {{ $customer->name ?? 'Público General' }}
            </div>
            <div class="cliente-item">
                <strong>ID / RTN:</strong> {{ $customer->id_number ?? 'N/A' }}
            </div>
            <div class="cliente-item">
                <strong>Teléfono:</strong> {{ $customer->phone ?? 'N/A' }}
            </div>
            <div class="cliente-item">
                @if(!empty($customer->email))
                    <strong>Correo:</strong> {{ $customer->email }}
                @else
                    <strong>Correo:</strong> N/A
                @endif
            </div>
        </div>
    </div>

    <div class="table-section">
        <table>
            <thead>
                <tr>
                    <th style="width: 6%">Nº</th>
                    <th style="width: 52%">Muestra / Análisis Solicitados</th>
                    <th style="width: 10%">Cantidad</th>
                    <th style="width: 10%" class="text-right">Precio</th>
                    <th style="width: 10%" class="text-right">Descuento</th>
                    <th style="width: 12%" class="text-right">Importe</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $groupedBySpecimen = $priceQuote->priceQuoteSpecimens->groupBy('specimen');
                    $rowNum = 1;
                    $calcAmount = 0.0;
                    $calcDiscount = 0.0;
                    $calcSubtotal = 0.0;
                    $calcExempt = 0.0;
                    $calcTaxable15 = 0.0;
                    $calcIsv15 = 0.0;
                    $calcTotal = 0.0;
                @endphp

                @foreach($groupedBySpecimen as $specCode => $items)
                    @php
                        $first = $items->first();
                        $typeName = $first->specimenType->name ?? '';
                        $category = $first->specimenCategory ?? ($first->specimen_category ? \App\Models\SpecimenCategory::find($first->specimen_category) : null);
                        $deliveryDuration = $category?->formatted_delivery_duration;
                        if (! $deliveryDuration && $category && isset($category->quantity, $category->unit)) {
                            $qty = (int) $category->quantity;
                            $unit = strtolower((string) $category->unit);
                            $unitLabel = match($unit) {
                                'minute', 'minutes' => $qty === 1 ? 'minuto' : 'minutos',
                                'hour', 'hours' => $qty === 1 ? 'hora' : 'horas',
                                'day', 'days' => $qty === 1 ? 'día' : 'días',
                                'week', 'weeks' => $qty === 1 ? 'semana' : 'semanas',
                                'month', 'months' => $qty === 1 ? 'mes' : 'meses',
                                default => $qty === 1 ? $unit : $unit . 's',
                            };
                            $deliveryDuration = "{$qty} {$unitLabel}";
                        }
                        $specQty = 0;
                        $specPrice = 0.0;
                        $specDisc = 0.0;
                        $specTotal = 0.0;

                        foreach($items as $it) {
                            $itQty = max(1, (int) ($it->quantity ?? 1));
                            $itAmt = (float) ($it->amount ?? 0);
                            $itDisc = (float) ($it->discount ?? 0);
                            $itSub = (float) ($it->subtotal ?? 0);
                            $itTot = (float) ($it->total ?? 0);

                            $specQty += $itQty;
                            $specPrice += $itAmt;
                            $specDisc += $itDisc;
                            $specTotal += $itTot;

                            $calcAmount += $itAmt;
                            $calcDiscount += $itDisc;
                            $calcSubtotal += $itSub;
                            $calcExempt += (float) ($it->exempt_amount ?? 0);
                            $calcTaxable15 += (float) ($it->taxable_amount_15 ?? 0);
                            $calcIsv15 += (float) ($it->isv_15 ?? 0);
                            $calcTotal += $itTot;
                        }
                    @endphp
                    <tr>
                        <td style="vertical-align: middle; padding: 6px 4px;">{{ $rowNum++ }}</td>
                        <td style="vertical-align: middle; padding: 6px 4px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px; margin-bottom: 4px;">
                                <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                                    @if(!empty($typeName))
                                        <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.3px; line-height: 1;">
                                            {{ $typeName }}
                                        </span>
                                    @endif

                                    @if($deliveryDuration)
                                        <span style="font-size: 8px; font-weight: 600; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 5px; border-radius: 3px; white-space: nowrap;">
                                            Entrega estimada: {{ $deliveryDuration }}
                                        </span>
                                    @endif

                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                @foreach($items as $item)
                                    @php
                                        $examName = $item->examination->name ?? 'Análisis';
                                        $itemQuantity = max(1, (int) ($item->quantity ?? 1));
                                    @endphp
                                    <div>
                                        <div style="font-weight: 500; font-size: 10px; color: #4b5563; line-height: 1.2;">
                                            {{ $examName }} <span style="font-size: 9px; font-weight: 600; color: #1e3a8a;"> x{{ $itemQuantity }}</span>
                                        </div>
                                        @if(!empty($item->age_discout_type) && (float)($item->age_discout_amount ?? 0) > 0)
                                            <div style="font-size: 7.5px; color: #059669; margin-top: 1px; font-weight: 500;">
                                                * Descuento {{ $item->age_discout_type === 'third' ? 'Tercera Edad' : 'Cuarta Edad' }}: - L. {{ number_format((float)$item->age_discout_amount, 2) }}
                                            </div>
                                        @endif
                                        @if(!empty($item->additional_discount_enabled) && (float)($item->additional_discount ?? 0) > 0)
                                            <div style="font-size: 7.5px; color: #059669; margin-top: 1px; font-weight: 500;">
                                                * Descuento Adicional: - L. {{ number_format((float)$item->additional_discount, 2) }}
                                            </div>
                                        @endif
                                    </div>
                                @endforeach
                            </div>
                        </td>
                        <td style="vertical-align: middle; padding: 6px 4px;">{{ $specQty }}</td>
                        <td class="text-right" style="vertical-align: middle; padding: 6px 4px;">L. {{ number_format($specPrice, 2) }}</td>
                        <td class="text-right" style="vertical-align: middle; padding: 6px 4px;">L. {{ number_format($specDisc, 2) }}</td>
                        <td class="text-right" style="vertical-align: middle; padding: 6px 4px;">L. {{ number_format($specTotal, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="totals-section">
        <div class="totals-left">
            <div style="margin-bottom: 12px; font-weight: 700; color: #1f2937;">
                SON: {{ $totalWords }}
            </div>

            <div class="disclaimer-text">
                <strong>Condiciones y Validez:</strong> Esta cotización tiene una vigencia de treinta (30) días calendario contados a partir de su emisión. Los precios cotizados reflejan los valores vigentes a la fecha y están sujetos a confirmación tras vencido dicho plazo. Este documento es de carácter puramente informativo y preliminar; no constituye factura fiscal, orden de compra, ni comprobante de pago con efectos tributarios.
            </div>
        </div>
        <div class="totals-right">
            <div class="total-row">
                <span>Importe Bruto:</span>
                <span>L. {{ number_format($calcAmount, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Descuentos y Rebajas:</span>
                <span>L. {{ number_format($calcDiscount, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Sub-Total:</span>
                <span>L. {{ number_format($calcSubtotal, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Importe Exento:</span>
                <span>L. {{ number_format($calcExempt, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Importe Gravado 15%:</span>
                <span>L. {{ number_format($calcTaxable15, 2) }}</span>
            </div>
            <div class="total-row">
                <span>ISV 15%:</span>
                <span>L. {{ number_format($calcIsv15, 2) }}</span>
            </div>
            <div class="total-row final-total">
                <span>Total Cotizado:</span>
                <span>L. {{ number_format($calcTotal, 2) }}</span>
            </div>
        </div>
    </div>

    <div class="footer-section">
        <div class="closing-section">
            <div class="schedule-note">
                <span>Nuestro horario de atención es de lunes a viernes, de 8:00am a 5:00pm y los sábados de 8:00am a 12:00m</span>
            </div>

            <div class="gratitude-note">
                Agradecemos que nos haya elegido y esperamos atenderle.
            </div>

            <div class="atentamente-block">
                <span class="atentamente-label">Atentamente:</span>
            </div>
			<span class="atentamente-signer">PatoLab</span>
        </div>

        <div class="stamp-container">
            @if(file_exists(public_path('images/sello.png')))
                <img class="round-seal" src="{{ public_path('images/sello.png') }}" alt="Sello PatoLab">
            @endif

            <div class="cotizacion-stamp">COTIZACIÓN</div>
        </div>

        <div class="original-copia">
            Original: Solicitante &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Copia: PatoLab
        </div>
        <div class="tagline">Calidad Diagnóstica A Su Servicio</div>
    </div>

</body>
</html>
