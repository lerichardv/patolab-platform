<footer class="report-footer">
    <div class="footer-divider"></div>
    <div class="confidentiality-notice">
        Este reporte contiene información médica confidencial. Consulte a su médico para adecuada interpretación del mismo.
    </div>
    
    <table class="footer-contact-table">
        <tr>
            <td class="contact-col" style="width: 22%;">
                <div class="contact-item">
                    <span class="contact-icon">&#9993;</span>
                    <span class="contact-text">info@PatoLab.org</span>
                </div>
            </td>
            <td class="contact-col" style="width: 20%;">
                <div class="contact-item">
                    <span class="contact-icon">&#9742;</span>
                    <span class="contact-text">+504 2510-6502</span>
                </div>
            </td>
            <td class="contact-col" style="width: 20%;">
                <div class="contact-item">
                    <span class="contact-icon">&#128222;</span>
                    <span class="contact-text">+504 9442 8529</span>
                </div>
            </td>
            <td class="contact-col" style="width: 38%; text-align: right;">
                <div class="contact-item" style="display: inline-block; text-align: left; max-width: 70mm;">
                    <span class="contact-icon" style="display: inline-block; vertical-align: top;">&#128205;</span>
                    <span class="contact-text" style="font-size: 1.5mm; line-height: 1.15; display: inline-block; vertical-align: top; max-width: 64mm;">Barrio los Andes: 7, 12-13 Calle Avenida, Sector N.O., Casa NO.: 105, Departamento: Cortes, Municipio: San Pedro Sula</span>
                </div>
            </td>
        </tr>
    </table>
    
    <div class="page-number-box">
        @if(isset($pageNum) && isset($totalPages))
            <span>Página {{ $pageNum }} de {{ $totalPages }}</span>
        @else
            <span class="page-num-counter"></span>
        @endif
    </div>
</footer>
