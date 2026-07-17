<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificación PatoLab</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            color: #334155;
            -webkit-font-smoothing: antialiased;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
            padding: 30px 20px;
            text-align: center;
            border-bottom: 4px solid #3b82f6;
        }
        .header img {
            max-height: 48px;
            height: auto;
            display: inline-block;
            vertical-align: middle;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 30px 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 13px;
        }
        .footer-divider {
            height: 1px;
            background-color: #cbd5e1;
            margin-bottom: 20px;
        }
        .confidentiality {
            font-style: italic;
            text-align: center;
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 20px;
            color: #94a3b8;
        }
        .contact-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .contact-col {
            vertical-align: top;
            padding: 5px;
        }
        .contact-item {
            margin-bottom: 8px;
        }
        .contact-icon {
            margin-right: 6px;
            color: #3b82f6;
            font-weight: bold;
        }
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #1d4ed8;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Heading / Logo -->
        <div class="header">
            <img src="cid:patolab-logo" alt="PatoLab Logo">
        </div>

        <!-- Body Content -->
        <div class="content">
            @yield('content')
        </div>

        <!-- Footer / Contact Info -->
        <div class="footer">
            <div class="confidentiality">
                Este reporte contiene información médica confidencial. Consulte a su médico para adecuada interpretación del mismo.
            </div>
            <div class="footer-divider"></div>
            <table class="contact-table">
                <tr>
                    <td class="contact-col" style="width: 50%;">
                        <div class="contact-item">
                            <span class="contact-icon">&#9993;</span>
                            <span>info@PatoLab.org</span>
                        </div>
                        <div class="contact-item">
                            <span class="contact-icon">&#128222;</span>
                            <span>+504 9442 8529</span>
                        </div>
                    </td>
                    <td class="contact-col" style="width: 50%; text-align: right;">
                        <div class="contact-item" style="display: inline-block; text-align: left; max-width: 250px;">
                            <span class="contact-icon" style="float: left; margin-top: 2px;">&#128205;</span>
                            <span style="display: block; margin-left: 20px; font-size: 11px; line-height: 1.3;">
                                Barrio los Andes: 7, 12-13 Calle Avenida, Sector N.O., Casa NO.: 105, Departamento: Cortes, Municipio: San Pedro Sula
                            </span>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
