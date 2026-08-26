<?php

namespace App\Services;

use RuntimeException;
use setasign\Fpdi\Tcpdf\Fpdi;

class PdfSignerService
{
    protected string $certPath;

    protected string $keyPath;

    protected string $caCertPath;

    public function __construct()
    {
        $this->certPath = config('services.pdf_signer.cert');
        $this->keyPath = config('services.pdf_signer.key');
        $this->caCertPath = config('services.pdf_signer.ca');

        if (! file_exists($this->keyPath) || ! is_readable($this->keyPath)) {
            throw new RuntimeException('La clave privada de firma no existe o no tiene permisos de lectura.');
        }
    }

    public function sign(string $inputPdfPath, string $outputPdfPath, array $metadata = []): string
    {
        $pdf = new Fpdi;

        // Deshabilitar header y footer automáticos de TCPDF para evitar errores de fuente (helvetica.json)
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);

        // Establecer márgenes en 0 para evitar desplazamientos al importar páginas
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false, 0);

        // Imporar el pdf completamente
        $pageCount = $pdf->setSourceFile($inputPdfPath);

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);

            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId);
        }

        // Configurar la firma
        $info = [
            'Name' => 'Patolab LIS - Firma Digital',
            'Location' => 'Servidor Seguro Patolab',
            'Reason' => 'Certificación de Integridad de Diagnóstico Clínico',
            'ContactInfo' => 'soporte@patolab.com',
        ];

        $cert = 'file://'.realpath($this->certPath);
        $key = 'file://'.realpath($this->keyPath);
        $ca = (! empty($this->caCertPath) && file_exists($this->caCertPath))
                ? realpath($this->caCertPath)
                : '';

        $pdf->setSignature($cert, $key, '', $ca, 2, $info);

        // $pdf->setSignatureAppearance(0, 0, 0, 0);
        $pdf->Output($outputPdfPath, 'F');

        return $outputPdfPath;
    }
}
