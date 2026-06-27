<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura {{ $invoice->full_invoice_number }}</title>
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

        .round-seal {
            width: 110px;
            height: auto;
            opacity: 0.8;
        }

        .specimen-section {
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            background-color: #eff6ff;
        }

        .specimen-info {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            text-align: right;
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

        .specimen-code-container {
            text-align: left;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
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
            <div class="factura-box-header">Factura</div>
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
                    <span style="text-transform: capitalize;">{{ $invoice->payment_type === 'credit' ? 'Crédito' : ($invoice->payment_type === 'check' ? 'Cheque' : 'Contado') }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="cliente-section">
        <div class="section-header">
            @if($invoice->is_group)
                Cliente Facturación (Grupo)
            @elseif($invoice->specimen && $invoice->specimen->sequence_code)
                Cliente y Muestra
            @else
                Cliente
            @endif
        </div>
        <div class="cliente-grid {{ !$invoice->is_group && $invoice->specimen && $invoice->specimen->sequence_code ? 'has-specimen' : '' }}">
            @if(!$invoice->is_group && $invoice->specimen && $invoice->specimen->sequence_code)
                <div style="grid-column: span 2; display: flex; flex-direction: column; align-items: flex-start;">
                    <span class="specimen-title">Código de Muestra</span>
                    <span class="specimen-code-badge">{{ $invoice->specimen->sequence_code }}</span>
                    <span style="font-size: 10px; color: #4b5563; margin-top: 2px;">{{ $invoice->specimen->type->name }}</span>
                </div>
                <div style="text-align: right; align-self: center; display: flex; flex-direction: column; align-items: flex-end;">
                    <span class="specimen-title">Fecha estimada del resultado</span>
                    <span class="specimen-value" style="font-size: 13px; font-weight: 800; color: #1e3a8a;">
                        {{ $invoice->specimen->expected_finalization_date ? $invoice->specimen->expected_finalization_date->format('d/m/Y h:i a') : 'N/A' }}
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
                @if($invoice->is_group)
                    @php
                        $specimensList = [];
                        if (isset($groupSpecimens)) {
                            $specimensList = $groupSpecimens;
                        } elseif ($invoice->is_group && $invoice->groupSpecimens && $invoice->groupSpecimens->isNotEmpty()) {
                            foreach ($invoice->groupSpecimens as $groupSpecimen) {
                                $specimen = $groupSpecimen->specimen;
                                $qty = (int) ($groupSpecimen->quantity ?? 1);
                                if ($qty <= 0) {
                                    $qty = 1;
                                }
                                $totalPrice = (float) $groupSpecimen->amount;
                                $totalDiscount = (float) $groupSpecimen->discount;
                                
                                $typeName = $specimen->type->name ?? '';
                                $examName = $specimen->examination->name ?? 'Examen';
                                $combinedName = $typeName ? $typeName . ' - ' . $examName : $examName;

                                $specimensList[] = [
                                    'sequence_code' => $specimen->sequence_code ?? '',
                                    'exam_name' => $combinedName,
                                    'patient_name' => $specimen->customerRelation->name ?? 'Paciente',
                                    'price' => $totalPrice,
                                    'discount' => $totalDiscount,
                                    'age_discount_type' => $groupSpecimen->age_discount_type,
                                    'age_discount_amount' => (float) $groupSpecimen->age_discount_amount,
                                    'additional_discount_enabled' => (bool) $groupSpecimen->additional_discount_enabled,
                                    'additional_discount' => (float) $groupSpecimen->additional_discount,
                                    'quantity' => $qty,
                                ];
                            }
                        } elseif ($invoice->is_group && $invoice->specimenGroup) {
                            foreach ($invoice->specimenGroup->specimens as $specimen) {
                                $igs = $specimen->invoiceGroupSpecimen()->where('invoice_id', $invoice->id)->first() ?? $specimen->invoiceGroupSpecimen;
                                $price = 0.00;
                                $discount = 0.00;
                                $qty = 1;
                                $ageDiscountType = null;
                                $ageDiscountAmount = 0.00;
                                $additionalDiscountEnabled = false;
                                $additionalDiscount = 0.00;
                                
                                if ($igs) {
                                    $price = (float)$igs->amount;
                                    $discount = (float)$igs->discount;
                                    $qty = (int)$igs->quantity;
                                    $ageDiscountType = $igs->age_discount_type;
                                    $ageDiscountAmount = (float)$igs->age_discount_amount;
                                    $additionalDiscountEnabled = (bool)$igs->additional_discount_enabled;
                                    $additionalDiscount = (float)$igs->additional_discount;
                                } else if ($specimen->type && $specimen->type->prices->isNotEmpty()) {
                                    $price = (float)$specimen->type->prices->first()->amount;
                                }
                                
                                $typeName = $specimen->type->name ?? '';
                                $examName = $specimen->examination->name ?? 'Examen';
                                $combinedName = $typeName ? $typeName . ' - ' . $examName : $examName;

                                $specimensList[] = [
                                    'sequence_code' => $specimen->sequence_code,
                                    'exam_name' => $combinedName,
                                    'patient_name' => $specimen->customerRelation->name ?? 'Paciente',
                                    'price' => $price,
                                    'discount' => $discount,
                                    'age_discount_type' => $ageDiscountType,
                                    'age_discount_amount' => $ageDiscountAmount,
                                    'additional_discount_enabled' => $additionalDiscountEnabled,
                                    'additional_discount' => $additionalDiscount,
                                    'quantity' => $qty,
                                ];
                            }
                        }
                        $rowNum = 1;
                    @endphp
                    @foreach($specimensList as $spec)
                        @php
                            $qty = (int) ($spec['quantity'] ?? 1);
                            if ($qty <= 0) {
                                $qty = 1;
                            }
                            $rowPrice = (float) $spec['price'];
                            $rowDiscount = (float) $spec['discount'];
                            $rowTotal = ($rowPrice - $rowDiscount) * $qty;
                        @endphp
                        <tr>
                            <td>{{ $rowNum++ }}</td>
                            <td>
                                <div style="font-weight: bold; font-size: 10.5px; color: #1f2937;">{{ $spec['exam_name'] }}</div>
                                <div style="font-size: 8.5px; color: #4b5563; margin-top: 3px;">
                                    Paciente: {{ $spec['patient_name'] }} &nbsp;|&nbsp; Muestra: <span style="font-family: monospace; font-weight: bold; color: #1e3a8a; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 3px;">{{ $spec['sequence_code'] }}</span>
                                </div>
                                @if(!empty($spec['age_discount_type']) && (float)($spec['age_discount_amount'] ?? 0) > 0)
                                    <div style="font-size: 8.5px; color: #10b981; margin-top: 3px; font-weight: 500;">
                                        * Descuento de {{ $spec['age_discount_type'] === 'third' ? 'Tercera Edad' : 'Cuarta Edad' }} aplicado: - L. {{ number_format($spec['age_discount_amount'], 2) }}
                                    </div>
                                @endif
                                @if(!empty($spec['additional_discount_enabled']) && (float)($spec['additional_discount'] ?? 0) > 0)
                                    <div style="font-size: 8.5px; color: #10b981; margin-top: 3px; font-weight: 500;">
                                        * Descuento Adicional aplicado: - L. {{ number_format($spec['additional_discount'], 2) }}
                                    </div>
                                @endif
                            </td>
                            <td>{{ $qty }}</td>
                            <td class="text-right">L. {{ number_format($rowPrice, 2) }}</td>
                            <td class="text-right">L. {{ number_format($rowDiscount, 2) }}</td>
                            <td class="text-right">L. {{ number_format($rowTotal, 2) }}</td>
                        </tr>
                    @endforeach
                    @if((float)($invoice->custom_amount ?? 0) > 0)
                    <tr>
                        <td>{{ $rowNum++ }}</td>
                        <td>
                            <div style="font-weight: bold; font-size: 10.5px; color: #1f2937;">{{ $invoice->custom_amount_reason ?? 'Cargo Adicional Personalizado' }}</div>
                            <div style="font-size: 8.5px; color: #4b5563; margin-top: 3px;">
                                Servicios
                            </div>
                        </td>
                        <td>1</td>
                        <td class="text-right">L. {{ number_format($invoice->custom_amount, 2) }}</td>
                        <td class="text-right">L. 0.00</td>
                        <td class="text-right">L. {{ number_format($invoice->custom_amount, 2) }}</td>
                    </tr>
                    @endif
                @else
                    @php
                        $qty = (int) ($invoice->quantity ?? 1);
                        if ($qty <= 0) {
                            $qty = 1;
                        }
                        $unitBaseExamPrice = (float)$invoice->amount;
                        $unitDiscount = (float)$invoice->discount / $qty;
                        $rowNum = 2;
                    @endphp
                    <tr>
                        <td>1</td>
                        <td>
                            <div style="font-weight: bold; font-size: 10.5px; color: #1f2937;">
                                @if($invoice->specimen && $invoice->specimen->type)
                                    {{ $invoice->specimen->type->name }} - 
                                @endif
                                {{ $examination->name }}
                            </div>
                            <div style="font-size: 8.5px; color: #4b5563; margin-top: 3px;">
                                Paciente: {{ $customer->name }}
                                @if($invoice->specimen && $invoice->specimen->sequence_code)
                                    &nbsp;|&nbsp; Muestra: <span style="font-family: monospace; font-weight: bold; color: #1e3a8a; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 3px;">{{ $invoice->specimen->sequence_code }}</span>
                                @endif
                            </div>
                            @if($invoice->age_discount_type)
                                <div style="font-size: 8.5px; color: #10b981; margin-top: 3px; font-weight: 500;">
                                    * Descuento de {{ $invoice->age_discount_type === 'third' ? 'Tercera Edad' : 'Cuarta Edad' }} aplicado: - L. {{ number_format($invoice->age_discount_amount, 2) }}
                                </div>
                            @endif
                        </td>
                        <td>{{ $qty }}</td>
                        <td class="text-right">L. {{ number_format($unitBaseExamPrice, 2) }}</td>
                        <td class="text-right">L. {{ number_format($unitDiscount, 2) }}</td>
                        <td class="text-right">L. {{ number_format(($unitBaseExamPrice - $unitDiscount) * $qty, 2) }}</td>
                    </tr>
                    @if((float)($invoice->custom_amount ?? 0) > 0)
                    <tr>
                        <td>{{ $rowNum++ }}</td>
                        <td>
                            <div style="font-weight: bold; font-size: 10.5px; color: #1f2937;">{{ $invoice->custom_amount_reason ?? 'Cargo Adicional Personalizado' }}</div>
                            <div style="font-size: 8.5px; color: #4b5563; margin-top: 3px;">
                                Servicios
                            </div>
                        </td>
                        <td>1</td>
                        <td class="text-right">L. {{ number_format($invoice->custom_amount, 2) }}</td>
                        <td class="text-right">L. 0.00</td>
                        <td class="text-right">L. {{ number_format($invoice->custom_amount, 2) }}</td>
                    </tr>
                    @endif
                @endif
            </tbody>
        </table>
    </div>

    <div class="totals-section">
        <div class="totals-left">
            {{ $totalWords }}

            @if($invoice->payment_type === 'credit' && $invoice->creditRelation)
                @php
                    $credit = $invoice->creditRelation;
                @endphp
                <div class="credit-info-box">
                    <div class="credit-info-title">Estado de Cuenta de Crédito</div>
                    <div class="credit-info-row">
                        <span>Monto de Crédito Original:</span>
                        <strong>L. {{ number_format($credit->credit_amount, 2) }}</strong>
                    </div>
                    <div class="credit-info-row">
                        <span>Abono realizado en esta Transacción:</span>
                        <strong style="color: #10b981;">L. {{ number_format($credit->amount_paid, 2) }}</strong>
                    </div>
                    <div class="credit-info-row">
                        <span>Abonos anteriores acumulados:</span>
                        <strong>L. 0.00</strong>
                    </div>
                    <div class="credit-info-row" style="border-top: 1px dashed #3b82f6; margin-top: 4px; padding-top: 4px;">
                        <span>Nuevo Saldo Pendiente:</span>
                        <strong style="color: {{ $credit->amount_remaining > 0 ? '#ef4444' : '#10b981' }};">L. {{ number_format($credit->amount_remaining, 2) }}</strong>
                    </div>
                </div>
            @endif
        </div>
        <div class="totals-right">
            <div class="total-row">
                <span>Importe:</span>
                <span>L. {{ number_format($invoice->amount, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Descuentos y Rebajas Otorgados:</span>
                <span>L. {{ number_format($invoice->discount, 2) }}</span>
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
                <span>L. {{ number_format($invoice->exempt_amount, 2) }}</span>
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
                <span>Total:</span>
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

            @if($invoice->payment_type !== 'credit')
                <div class="pagado-stamp">PAGADO</div>
            @else
                <div class="pagado-stamp" style="border-color: #ef4444; color: #ef4444;">AL CRÉDITO</div>
            @endif
        </div>

        <div class="original-copia">
            Original: Cliente &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Copia: Emisor
        </div>
        <div class="tagline">Calidad Diagnóstica A Su Servicio</div>
    </div>

</body>
</html>
