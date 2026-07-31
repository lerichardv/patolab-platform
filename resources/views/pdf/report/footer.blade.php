<footer class="report-footer">
    <div class="footer-divider"></div>
    <div class="confidentiality-notice">
        Este reporte contiene información médica confidencial. Consulte a su médico para adecuada interpretación del mismo.
    </div>
    
    <table class="footer-contact-table">
        <tr>
            <td class="contact-col" style="width: 30%;">
                <div class="contact-item">
                    <img class="contact-icon" style="height: 2.65mm; width: auto; display: inline-block; vertical-align: middle; margin-right: 0.79mm;" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxZTNhOGEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMTYiIHg9IjIiIHk9IjQiIHJ4PSIyIi8+PHBhdGggZD0ibTIyIDctOC45NyA1LjdhMS45NCAxLjk0IDAgMCAxLTIuMDYgMEwyIDciLz48L3N2Zz4=" />
                    <span class="contact-text">info@PatoLab.org</span>
                </div>
            </td>
            <td class="contact-col" style="width: 30%;">
                <div class="contact-item">
                    <img class="contact-icon" style="height: 2.65mm; width: auto; display: inline-block; vertical-align: middle; margin-right: 0.79mm;" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxZTNhOGEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjIgMTYuOTJ2M2EyIDIgMCAwIDEtMi4xOCAyIDE5Ljc5IDE5Ljc5IDAgMCAxLTguNjMtMy4wNyAxOS41IDE5LjUgMCAwIDEtNi02IDE5Ljc5IDE5Ljc5IDAgMCAxLTMuMDctOC42N0EyIDIgMCAwIDEgNC4xMSAyaDNhMiAyIDAgMCAxIDIgMS43MiAxMi44NCAxMi44NCAwIDAgMCAuNyAyLjgxIDIgMiAwIDAgMS0uNDUgMi4xMUw4LjA5IDkuOTFhMTYgMTYgMCAwIDAgNiA2bDEuMjctMS4yN2EyIDIgMCAwIDEgMi4xMS0uNDUgMTIuODQgMTIuODQgMCAwIDAgMi44MS43QTIgMiAwIDAgMSAyMiAxNi55MnoiLz48L3N2Zz4=" />
                    <span class="contact-text">+504 9442 8529</span>
                </div>
            </td>
            <td class="contact-col" style="width: 40%; text-align: right;">
                <div class="contact-item" style="display: inline-block; text-align: left; max-width: 70mm;">
                    <img class="contact-icon" style="height: 2.65mm; width: auto; display: inline-block; vertical-align: top; margin-right: 0.79mm; margin-top: 0.2mm;" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxZTNhOGEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA0Ljk5My01LjUzOSAxMC4xOTMtNy4zOTkgMTEuNzk5YTEgMSAwIDAgMS0xLjIwMiAwQzkuNTM5IDIwLjE5MyA0IDE0Ljk5MyA0IDEwYTggOCAwIDAgMSAxNiAweiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=" />
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
