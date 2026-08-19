import React from 'react';

export interface HeaderProps {
    specimen: {
        sequence_code: string;
    };
    pageNum?: number;
}

export default function Header({ specimen, pageNum }: HeaderProps) {
    return (
        <div
            style={{
                width: '100%',
                height: '27.0mm',
                marginBottom: '2.5mm',
            }}
        >
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    marginBottom: '0.53mm',
                    position: 'relative',
                    marginTop: '-4mm',
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
                            maxHeight: '16mm',
                            width: 'auto',
                            marginBottom: '1.06mm',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                        src="/images/patolab-logo-horizontal-full.png"
                        alt="Logo PatoLab"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = document.getElementById(
                                `preview-logo-text-fallback-${pageNum ?? 1}`,
                            );

                            if (fallback) {
                                fallback.style.display = 'block';
                            }
                        }}
                    />
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: '0mm',
                        top: '0mm',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#f3f4f6',
                            border: '0.26mm solid #d1d5db',
                            color: '#374151',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '2.91mm',
                            padding: '1.06mm 2.12mm',
                            borderRadius: '1.06mm',
                            display: 'inline-block',
                        }}
                    >
                        N° {specimen.sequence_code}
                    </div>
                </div>
            </div>

            <div
                style={{
                    textAlign: 'center',
                    fontSize: '2.5mm',
                    fontStyle: 'italic',
                }}
            >
                Calidad diagnóstica a su servicio
            </div>

            <div
                style={{
                    textAlign: 'center',
                    fontSize: '4.23mm',
                    fontWeight: 700,
                    color: '#000000',
                    marginTop: '0.63mm',
                    marginBottom: '0.69mm',
                    letterSpacing: '0.13mm',
                    paddingBottom: '3.18mm',
                    textTransform: 'uppercase',
                }}
            >
                INFORME DE ANATOMÍA PATOLÓGICA
            </div>
            <div
                style={{
                    width: '100%',
                    height: '0.53mm',
                    backgroundColor: '#000000',
                    marginTop: '0.53mm',
                }}
            />
        </div>
    );
}
