<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Stickers de Casette - Patolab</title>
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
            size: 0.75in 0.2in;
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
            width: 0.75in;
            height: 0.2in;
        }

        .cassette-page {
            width: 0.75in;
            height: 0.2in;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: row;
            align-items: center;
            page-break-after: always;
            break-after: page;
            padding: 0.02in 0.015in 0.003in 0.015in;
        }

        .cassette-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
        }

        .cutting-col {
            width: 0.15in;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .cutting-code-letter {
            font-size: 13pt;
            font-weight: bold;
            line-height: 0.9;
            color: #000000;
            text-align: center;
            text-transform: uppercase;
        }

        .info-col {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding-left: 0.015in;
            line-height: 1.05;
            overflow: hidden;
        }

        .brand-line {
            font-size: 3.3pt;
            font-weight: bold;
            letter-spacing: -0.15px;
            color: #000000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-transform: uppercase;
        }

        .specimen-line {
            font-size: 4.8pt;
            font-weight: bold;
            letter-spacing: 0.1px;
            color: #000000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-transform: uppercase;
        }

        .patient-line {
            font-size: 4.2pt;
            color: #000000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    @foreach ($labels as $label)
        <div class="cassette-page">
            <div class="cutting-col">
                <span class="cutting-code-letter">{{ strtoupper($label['cutting_code']) }}</span>
            </div>

            <div class="info-col">
                <div class="brand-line">{{ $label['laboratory_name'] ?? 'Laboratorio Patolab' }}</div>
                <div class="specimen-line">{{ strtoupper($label['specimen_code']) }}</div>
                <div class="patient-line">{{ $label['patient_name'] }}</div>
            </div>
        </div>
    @endforeach
</body>
</html>
