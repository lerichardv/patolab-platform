import React from 'react';
import type { DeliveryNoteWorkOrder } from '../types';

export interface DeliveryNoteHeaderProps {
    workOrder: DeliveryNoteWorkOrder;
    pageNum?: number;
}

export default function DeliveryNoteHeader({
    pageNum = 1,
}: DeliveryNoteHeaderProps) {
    return (
        <div
            style={{
                width: '100%',
                marginBottom: '4.5mm',
            }}
        >
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '-2.0mm',
                    marginBottom: '0.5mm',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <img
                        style={{
                            maxHeight: '11mm',
                            width: 'auto',
                            marginBottom: '0.6mm',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                        src="/images/patolab-logo-horizontal-full.png"
                        alt="Logo PatoLab"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = document.getElementById(
                                `preview-logo-text-fallback-${pageNum}`,
                            );

                            if (fallback) {
                                fallback.style.display = 'block';
                            }
                        }}
                    />
                    <div
                        id={`preview-logo-text-fallback-${pageNum}`}
                        style={{ display: 'none', textAlign: 'center' }}
                    >
                        <div
                            style={{
                                fontSize: '5.2mm',
                                fontWeight: 800,
                                color: '#1e3a8a',
                                fontFamily: 'Arial, Helvetica, sans-serif',
                            }}
                        >
                            PatoLab
                        </div>
                        <div
                            style={{
                                fontSize: '1.8mm',
                                color: '#6b7280',
                                fontFamily: 'Arial, Helvetica, sans-serif',
                                letterSpacing: '0.13mm',
                            }}
                        >
                            LABORATORIO DE PATOLOGÍA & CITOLOGÍA
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    textAlign: 'center',
                    fontSize: '2.3mm',
                    lineHeight: '3.0mm',
                    fontStyle: 'italic',
                }}
            >
                Calidad diagnóstica a su servicio
            </div>

            <div
                style={{
                    textAlign: 'center',
                    fontSize: '4.8mm',
                    lineHeight: '5.0mm',
                    fontWeight: 700,
                    color: '#000000',
                    marginTop: '1.7mm',
                    marginBottom: '0.6mm',
                    textTransform: 'uppercase',
                }}
            >
                NOTA DE ENTREGA
            </div>
            <div
                style={{
                    width: '100%',
                    height: '0.5mm',
                    backgroundColor: '#000000',
                    marginTop: '0.5mm',
                }}
            />
        </div>
    );
}
