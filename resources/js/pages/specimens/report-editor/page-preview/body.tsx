import React from 'react';

import { cn } from '@/lib/utils';
import type { MeasuredBlock, PreviewSpecimen, PreviewUser } from './types';

export function PatientMetadataCard({
    specimen,
    sampleCollectionDate,
    reportDate,
}: {
    specimen: PreviewSpecimen;
    sampleCollectionDate?: string;
    reportDate?: string;
}) {
    return (
        <table
            style={{
                width: '100%',
                border: '0.26mm solid #bfdbfe',
                borderRadius: '1.59mm',
                backgroundColor: '#eff6ff',
                marginBottom: '2.97mm',
                padding: '2.65mm 3.70mm',
                borderCollapse: 'collapse',
            }}
            className="shrink-0"
        >
            <tbody>
                <tr>
                    <td
                        style={{
                            width: '55%',
                            padding: '1.32mm 2.12mm',
                            verticalAlign: 'top',
                            fontSize: '2.91mm',
                            lineHeight: '4.23mm',
                            border: 'none',
                        }}
                    >
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Nombre:
                        </strong>{' '}
                        {specimen.customer_relation.name}
                        <br />
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Edad:
                        </strong>{' '}
                        {specimen.customer_relation.age ?? 'N/A'} años
                        &nbsp;&nbsp;&nbsp;{' '}
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Sexo:
                        </strong>{' '}
                        {['m', 'masculino', 'hombre'].includes(
                            (
                                specimen.customer_relation.gender || ''
                            ).toLowerCase(),
                        )
                            ? 'M'
                            : ['f', 'femenino', 'mujer'].includes(
                                    (
                                        specimen.customer_relation.gender || ''
                                    ).toLowerCase(),
                                )
                              ? 'F'
                              : ['o', 'otro'].includes(
                                      (
                                          specimen.customer_relation.gender ||
                                          ''
                                      ).toLowerCase(),
                                  )
                                ? 'O'
                                : 'N/A'}
                        <br />
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Médico Remitente:
                        </strong>{' '}
                        {specimen.referrer_relation.name}
                        <br />
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Hospital/Clínica:
                        </strong>{' '}
                        {specimen.referrer_relation.notes}
                    </td>
                    <td
                        style={{
                            width: '45%',
                            padding: '1.32mm 2.12mm 1.32mm 3.18mm',
                            verticalAlign: 'top',
                            fontSize: '2.91mm',
                            lineHeight: '4.23mm',
                            border: 'none',
                        }}
                    >
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Diagnóstico Clínico:
                        </strong>{' '}
                        {specimen.diagnosis || ''}
                        <br />
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Sitio Anatómico:
                        </strong>{' '}
                        {specimen.anatomic_site || 'N/A'}
                        <br />
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Fecha de la toma:
                        </strong>{' '}
                        {sampleCollectionDate
                            ? new Date(
                                  sampleCollectionDate + 'T00:00:00',
                              ).toLocaleDateString('es-HN')
                            : 'N/A'}
                        <br />
                        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Fecha de Recepción:
                        </strong>{' '}
                        {reportDate
                            ? new Date(
                                  reportDate + 'T00:00:00',
                              ).toLocaleDateString('es-HN')
                            : 'N/A'}
                    </td>
                </tr>
            </tbody>
        </table>
    );
}

export function SectionHeader({ title }: { title: string }) {
    return (
        <div
            style={{
                fontSize: '2.91mm',
                fontWeight: 700,
                color: '#000000',
                marginTop: '2.65mm',
                marginBottom: '1.32mm',
                textTransform: 'uppercase',
                lineHeight: '3.97mm',
                height: '3.97mm',
            }}
            className="shrink-0"
        >
            {title}
        </div>
    );
}

export function SignatureBlock({
    users,
    finalizationDate,
}: {
    users?: PreviewUser[];
    reportDate?: string;
    finalizationDate?: string;
}) {
    if (!users || users.length === 0) {
        return null;
    }

    const assignedUsers = users;

    // Chunk assignedUsers into rows of 2
    const chunks: (typeof assignedUsers)[] = [];

    for (let i = 0; i < assignedUsers.length; i += 2) {
        chunks.push(assignedUsers.slice(i, i + 2));
    }

    return (
        <div
            style={{
                marginTop: '3.97mm',
                display: 'flex',
                flexDirection: 'column',
                gap: '4mm',
                alignItems: 'center',
                width: '100%',
            }}
            className="shrink-0"
        >
            {chunks.map((row, rowIndex) => (
                <div
                    key={rowIndex}
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        gap: '15mm',
                        width: '100%',
                    }}
                >
                    {row.map((pathologist) => (
                        <div
                            key={pathologist.id}
                            style={{
                                width: '58.21mm',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            {pathologist.signature_url ? (
                                <img
                                    src={pathologist.signature_url}
                                    alt={`Firma de ${pathologist.name}`}
                                    style={{
                                        maxHeight: '12mm',
                                        width: 'auto',
                                        marginBottom: '2mm',
                                        display: 'block',
                                    }}
                                />
                            ) : (
                                <div style={{ height: '14mm' }} />
                            )}
                            <div
                                style={{
                                    width: '100%',
                                    borderTop: '0.40mm solid #4b5563',
                                    marginBottom: '1.32mm',
                                }}
                            />
                            <div
                                style={{
                                    fontSize: '2.65mm',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {pathologist.name}
                            </div>
                            <div
                                style={{
                                    fontSize: '2.25mm',
                                    color: '#4b5563',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {pathologist.role?.name ||
                                    'PATOLOGÍA ONCOLÓGICA'}
                            </div>
                            <div
                                style={{
                                    fontSize: '2.38mm',
                                    fontWeight: 600,
                                    color: '#374151',
                                    marginTop: '1.32mm',
                                }}
                            >
                                FECHA:{' '}
                                {finalizationDate
                                    ? new Date(
                                          finalizationDate + 'T00:00:00',
                                      ).toLocaleDateString('es-HN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: '2-digit',
                                      })
                                    : new Date().toLocaleDateString('es-HN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: '2-digit',
                                      })}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export interface BodyProps {
    pageBlocks: MeasuredBlock[];
    specimen: PreviewSpecimen;
    sampleCollectionDate?: string;
    reportDate?: string;
    finalizationDate?: string;
}

export default function Body({
    pageBlocks,
    specimen,
    sampleCollectionDate = '',
    reportDate = '',
    finalizationDate = '',
}: BodyProps) {
    return (
        <div
            style={{
                width: '100%',
                height: '212.79mm',
                maxHeight: '212.79mm',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
            }}
        >
            {pageBlocks.map((block) => {
                if (block.type === 'patient-card') {
                    return (
                        <PatientMetadataCard
                            key={block.id}
                            specimen={specimen}
                            sampleCollectionDate={sampleCollectionDate}
                            reportDate={reportDate}
                        />
                    );
                }

                if (block.type === 'section-header') {
                    return (
                        <SectionHeader
                            key={block.id}
                            title={block.title || ''}
                        />
                    );
                }

                if (block.type === 'signature') {
                    return (
                        <SignatureBlock
                            key={block.id}
                            users={specimen.users}
                            reportDate={reportDate}
                            finalizationDate={finalizationDate}
                        />
                    );
                }

                if (block.type === 'cuttings-summary') {
                    return (
                        <div
                            key={block.id}
                            className="preview-content shrink-0 select-none"
                            style={{
                                fontSize: '2.51mm',
                                lineHeight: '3.97mm',
                                textAlign: 'justify',
                                marginTop: '2.0mm',
                                marginBottom: '2.0mm',
                                fontFamily: 'inherit',
                                fontWeight: 'normal',
                            }}
                        >
                            <u>Cortes</u>: {block.text?.replace('Cortes: ', '')}
                        </div>
                    );
                }

                if (block.type === 'new-cuttings-summary') {
                    return (
                        <div
                            key={block.id}
                            className="preview-content shrink-0 select-none"
                            style={{
                                fontSize: '2.51mm',
                                lineHeight: '3.97mm',
                                textAlign: 'justify',
                                marginTop: '2.0mm',
                                marginBottom: '2.0mm',
                                fontFamily: 'inherit',
                                fontWeight: 'normal',
                            }}
                        >
                            <u>Nuevos Cortes</u>:{' '}
                            {block.text?.replace('Nuevos Cortes: ', '')}
                        </div>
                    );
                }

                if (
                    block.type === 'html' ||
                    block.type === 'heading' ||
                    block.type === 'image'
                ) {
                    return (
                        <div
                            key={block.id}
                            className={cn(
                                block.className || 'section-content',
                                'preview-content shrink-0',
                            )}
                            dangerouslySetInnerHTML={{
                                __html: block.html || '',
                            }}
                        />
                    );
                }

                return null;
            })}
        </div>
    );
}
