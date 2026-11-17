<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Stickers de Muestra - Patolab</title>
    <style>
        @if (!empty($arialNarrowBase64))
        @font-face {
            font-family: 'Arial Narrow';
            src: url('data:font/truetype;charset=utf-8;base64,{{ $arialNarrowBase64 }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        @font-face {
            font-family: 'Arial Narrow';
            src: url('data:font/truetype;charset=utf-8;base64,{{ $arialNarrowBase64 }}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        @endif

        @page {
            size: 0.9375in 0.9375in landscape;
            margin: 0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Arial Narrow', 'Nimbus Sans L', Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            width: 0.9375in;
            height: 0.9375in;
        }

        .sticker-page {
            width: 0.9375in;
            height: 0.9375in;
            position: relative;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            padding: 0.015in 0.015in 0.015in 0.015in;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .sticker-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
        }

        /* Top Right Cutting Badge */
        .cutting-badge {
            position: absolute;
            top: 0.012in;
            right: 0.015in;
            font-size: 11.5pt;
            font-weight: bold;
            line-height: 0.82;
            color: #000000;
            text-align: right;
            text-transform: uppercase;
            z-index: 10;
        }

        /* Top Block: 4 Lines */
        .top-block {
            width: 100%;
            height: 0.46in;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: space-between;
            text-align: left;
            overflow: hidden;
        }

        .line-lab {
            font-size: 5.9pt;
            font-weight: bold;
            line-height: 1.0;
            letter-spacing: -0.15px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            text-align: left;
            text-transform: uppercase;
        }

        .has-cutting .line-lab {
            max-width: 0.77in;
        }

        .line-biopsy {
            font-size: 7.2pt;
            font-weight: bold;
            line-height: 1.0;
            letter-spacing: -0.15px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            text-align: left;
        }

        .line-sequence {
            font-size: 8.5pt;
            font-weight: bold;
            line-height: 1.0;
            letter-spacing: -0.25px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            text-align: left;
            text-transform: uppercase;
        }

        .line-marker {
            font-size: 7.0pt;
            font-weight: bold;
            line-height: 1.0;
            letter-spacing: -0.1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            text-align: left;
            text-transform: uppercase;
        }

        /* Bottom Block: QR on left + Patient Name on right */
        .bottom-block {
            width: 100%;
            height: 0.38in;
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            justify-content: flex-start;
            overflow: hidden;
        }

        .qr-wrapper {
            width: 0.34in;
            height: 0.34in;
            flex-shrink: 0;
            display: flex;
            align-items: flex-end;
            justify-content: flex-start;
            margin: 0;
            padding: 0;
        }

        .qr-wrapper img {
            width: 0.34in;
            height: 0.34in;
            display: block;
            image-rendering: pixelated;
        }

        .patient-wrapper {
            flex: 1;
            margin-left: 0.035in;
            height: 0.34in;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            text-align: left;
        }

        .patient-line {
            font-size: 6.5pt;
            font-weight: bold;
            line-height: 1.1;
            letter-spacing: -0.25px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #000000;
        }
    </style>
</head>
<body>
    @foreach ($labels as $label)
        <div class="sticker-page">
            @if (!empty($label['cutting_code']))
                <div class="cutting-badge">{{ strtoupper($label['cutting_code']) }}</div>
            @endif

            <div class="top-block {{ !empty($label['cutting_code']) ? 'has-cutting' : '' }}">
                <div class="line-lab">{{ $label['laboratory_name'] ?? 'Laboratorio Patolab' }}</div>
                @if (!empty($label['biopsy_number']))
                    <div class="line-biopsy">{{ $label['biopsy_number'] }}</div>
                @endif
                <div class="line-sequence">{{ strtoupper($label['code']) }}</div>
                @if (!empty($label['marker_name']))
                    <div class="line-marker">{{ $label['marker_name'] }}</div>
                @endif
            </div>

            <div class="bottom-block">
                <div class="qr-wrapper">
                    <img src="{{ $label['qr_data_uri'] }}" alt="QR" />
                </div>
                <div class="patient-wrapper">
                    <div class="patient-line">{{ $label['name_line_1'] }}</div>
                    <div class="patient-line">{{ $label['name_line_2'] }}</div>
                </div>
            </div>
        </div>
    @endforeach
</body>
</html>
