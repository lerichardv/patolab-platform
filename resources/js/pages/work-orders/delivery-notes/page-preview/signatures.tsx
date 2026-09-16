import React from 'react';

export default function Signatures() {
    return (
        <div
            className="signatures-wrapper"
            style={{
                marginTop: '3.5mm',
                width: '100%',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
            }}
        >
            <table
                className="signatures-table"
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
                                width: '45%',
                                textAlign: 'center',
                                border: 'none',
                                verticalAlign: 'bottom',
                                padding: 0,
                            }}
                        >
                            <div
                                className="signature-line-box"
                                style={{
                                    width: '65mm',
                                    margin: '0 auto',
                                    textAlign: 'center',
                                }}
                            >
                                <div
                                    className="signature-gap"
                                    style={{ height: '13.5mm', width: '100%' }}
                                />
                                <div
                                    className="signature-line"
                                    style={{
                                        width: '100%',
                                        borderTop: '0.40mm solid #1f2937',
                                        marginBottom: '1.5mm',
                                    }}
                                />
                                <span
                                    className="signature-label"
                                    style={{
                                        fontSize: '3.18mm',
                                        fontWeight: 700,
                                        color: '#1f2937',
                                        letterSpacing: '0.2mm',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    FIRMA ENTREGA
                                </span>
                            </div>
                        </td>
                        <td
                            style={{ width: '10%', border: 'none', padding: 0 }}
                        />
                        <td
                            style={{
                                width: '45%',
                                textAlign: 'center',
                                border: 'none',
                                verticalAlign: 'bottom',
                                padding: 0,
                            }}
                        >
                            <div
                                className="signature-line-box"
                                style={{
                                    width: '65mm',
                                    margin: '0 auto',
                                    textAlign: 'center',
                                }}
                            >
                                <div
                                    className="signature-gap"
                                    style={{ height: '18mm', width: '100%' }}
                                />
                                <div
                                    className="signature-line"
                                    style={{
                                        width: '100%',
                                        borderTop: '0.40mm solid #1f2937',
                                        marginBottom: '1.5mm',
                                    }}
                                />
                                <span
                                    className="signature-label"
                                    style={{
                                        fontSize: '3.18mm',
                                        fontWeight: 700,
                                        color: '#1f2937',
                                        letterSpacing: '0.2mm',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    FIRMA RECIBE
                                </span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
