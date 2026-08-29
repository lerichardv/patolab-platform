import { Mail, MapPin, Phone } from 'lucide-react';
import React from 'react';

export interface FooterProps {
    pageNum: number;
    totalPages: number;
}

export default function Footer({ pageNum, totalPages }: FooterProps) {
    return (
        <div
            style={{
                position: 'absolute',
                bottom: '5mm',
                left: '15mm',
                right: '15mm',
                height: '24mm',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '0.53mm',
                    backgroundColor: '#000000',
                    marginBottom: '0.79mm',
                }}
            />
            <div
                style={{
                    textAlign: 'center',
                    fontSize: '3.18mm',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '1.59mm',
                }}
            >
                Este reporte contiene información médica confidencial. Consulte
                a su médico para adecuada interpretación del mismo.
            </div>

            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: 'none',
                }}
            >
                <tbody>
                    <tr style={{ border: 'none' }}>
                        <td
                            style={{
                                width: '30%',
                                verticalAlign: 'middle',
                                fontSize: '3.18mm',
                                color: '#4b5563',
                                border: 'none',
                                padding: '0mm',
                            }}
                        >
                            <Mail
                                style={{
                                    display: 'inline-block',
                                    marginRight: '0.79mm',
                                    color: '#1e3a8a',
                                    width: '3.70mm',
                                    height: '3.70mm',
                                    verticalAlign: 'middle',
                                }}
                            />
                            info@PatoLab.org
                        </td>
                        <td
                            style={{
                                width: '30%',
                                verticalAlign: 'middle',
                                fontSize: '3.18mm',
                                color: '#4b5563',
                                border: 'none',
                                padding: '0mm',
                            }}
                        >
                            <Phone
                                style={{
                                    display: 'inline-block',
                                    marginRight: '0.79mm',
                                    color: '#1e3a8a',
                                    width: '3.70mm',
                                    height: '3.70mm',
                                    verticalAlign: 'middle',
                                }}
                            />
                            +504 9442 8529
                        </td>
                        <td
                            style={{
                                width: '40%',
                                verticalAlign: 'middle',
                                fontSize: '3.18mm',
                                color: '#4b5563',
                                border: 'none',
                                padding: '0mm',
                                textAlign: 'right',
                            }}
                        >
                            <div
                                style={{
                                    display: 'inline-block',
                                    textAlign: 'left',
                                    maxWidth: '70mm',
                                }}
                            >
                                <MapPin
                                    style={{
                                        display: 'inline-block',
                                        marginRight: '0.79mm',
                                        color: '#1e3a8a',
                                        width: '3.70mm',
                                        height: '3.70mm',
                                        verticalAlign: 'top',
                                        marginTop: '0.2mm',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '2.65mm',
                                        lineHeight: '1.15',
                                        display: 'inline-block',
                                        verticalAlign: 'top',
                                        maxWidth: '64mm',
                                    }}
                                >
                                    Barrio los Andes: 7, 12-13 Calle Avenida,
                                    Sector N.O., Casa NO.: 105, Departamento:
                                    Cortes, Municipio: San Pedro Sula
                                </span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div
                style={{
                    position: 'absolute',
                    bottom: '4mm',
                    left: '0mm',
                    fontSize: '3.18mm',
                    fontWeight: 600,
                    color: '#4b5563',
                }}
            >
                Página {pageNum} de {totalPages}
            </div>
        </div>
    );
}
