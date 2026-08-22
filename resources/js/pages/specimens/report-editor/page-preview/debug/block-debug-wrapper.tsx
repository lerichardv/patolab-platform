import React, { useState } from 'react';
import { useDebugReport } from './debug-context';
import type { MeasuredBlock } from './types';

interface BlockDebugWrapperProps {
    block: MeasuredBlock;
    index: number;
    children: React.ReactNode;
}

const BLOCK_THEMES: Record<
    string,
    {
        border: string;
        bg: string;
        badgeBg: string;
        badgeText: string;
        label: string;
    }
> = {
    'patient-card': {
        border: '#0284c7', // Sky blue
        bg: 'rgba(2, 132, 199, 0.03)',
        badgeBg: '#0284c7',
        badgeText: '#ffffff',
        label: 'FICHA PACIENTE',
    },
    'section-header': {
        border: '#ec4899', // Pink / Magenta
        bg: 'rgba(236, 72, 153, 0.03)',
        badgeBg: '#ec4899',
        badgeText: '#ffffff',
        label: 'ENCABEZADO SECCIÓN',
    },
    heading: {
        border: '#8b5cf6', // Purple
        bg: 'rgba(139, 92, 246, 0.03)',
        badgeBg: '#8b5cf6',
        badgeText: '#ffffff',
        label: 'TÍTULO',
    },
    paragraph: {
        border: '#06b6d4', // Cyan
        bg: 'rgba(6, 182, 212, 0.02)',
        badgeBg: '#0891b2',
        badgeText: '#ffffff',
        label: 'PÁRRAFO',
    },
    list: {
        border: '#84cc16', // Lime
        bg: 'rgba(132, 204, 22, 0.03)',
        badgeBg: '#65a30d',
        badgeText: '#ffffff',
        label: 'LISTA',
    },
    table: {
        border: '#f59e0b', // Amber
        bg: 'rgba(245, 158, 11, 0.03)',
        badgeBg: '#d97706',
        badgeText: '#ffffff',
        label: 'TABLA',
    },
    image: {
        border: '#10b981', // Emerald
        bg: 'rgba(16, 185, 129, 0.03)',
        badgeBg: '#059669',
        badgeText: '#ffffff',
        label: 'IMAGEN',
    },
    'image-grid': {
        border: '#10b981', // Emerald
        bg: 'rgba(16, 185, 129, 0.03)',
        badgeBg: '#059669',
        badgeText: '#ffffff',
        label: 'GALERÍA IMÁGENES',
    },
    signature: {
        border: '#f43f5e', // Rose
        bg: 'rgba(244, 63, 94, 0.03)',
        badgeBg: '#e11d48',
        badgeText: '#ffffff',
        label: 'FIRMAS',
    },
    'cuttings-summary': {
        border: '#f97316', // Orange
        bg: 'rgba(249, 115, 22, 0.03)',
        badgeBg: '#ea580c',
        badgeText: '#ffffff',
        label: 'RESUMEN CORTES',
    },
    'new-cuttings-summary': {
        border: '#f97316', // Orange
        bg: 'rgba(249, 115, 22, 0.03)',
        badgeBg: '#ea580c',
        badgeText: '#ffffff',
        label: 'NUEVOS CORTES',
    },
    html: {
        border: '#64748b', // Slate
        bg: 'rgba(100, 116, 139, 0.02)',
        badgeBg: '#475569',
        badgeText: '#ffffff',
        label: 'BLOQUE HTML',
    },
};

export function BlockDebugWrapper({
    block,
    index,
    children,
}: BlockDebugWrapperProps) {
    const {
        isEnvDebugReportEnabled,
        showMaster,
        showBlockBounds,
        showSubElements,
        compactMode,
        selectedBlockId,
        hoveredBlockId,
        setSelectedBlockId,
        setHoveredBlockId,
    } = useDebugReport();

    const [isLocalHovered, setIsLocalHovered] = useState(false);

    if (!isEnvDebugReportEnabled || !showMaster || !showBlockBounds) {
        return <>{children}</>;
    }

    const typeKey =
        block.debugMeta?.blockType?.toLowerCase() || block.type || 'html';
    const normalizedType =
        Object.keys(BLOCK_THEMES).find((k) => typeKey.includes(k)) || 'html';

    const theme = BLOCK_THEMES[normalizedType] || BLOCK_THEMES.html;
    const isSelected = selectedBlockId === block.id;
    const isHovered = isLocalHovered || hoveredBlockId === block.id;

    const debugMeta = block.debugMeta;
    const heightMm = block.height ?? 0;
    const startY = debugMeta?.accumHeightBeforeMm ?? 0;
    const endY = debugMeta?.accumHeightAfterMm ?? startY + heightMm;

    return (
        <div
            className="group relative transition-all duration-150"
            style={{
                outline: isSelected
                    ? `2px solid #00f0ff`
                    : isHovered
                      ? `1.5px solid ${theme.border}`
                      : `1px dashed ${theme.border}`,
                outlineOffset: '0.4mm',
                backgroundColor: isSelected
                    ? 'rgba(0, 240, 255, 0.06)'
                    : isHovered
                      ? theme.bg
                      : 'transparent',
                borderRadius: '0.6mm',
                margin: '0.2mm 0',
                cursor: 'pointer',
            }}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedBlockId(isSelected ? null : block.id);
            }}
            onMouseEnter={() => {
                setIsLocalHovered(true);
                setHoveredBlockId(block.id);
            }}
            onMouseLeave={() => {
                setIsLocalHovered(false);
                setHoveredBlockId(null);
            }}
        >
            {/* GSAP TRIGGER CORNER MARKERS */}
            <div
                style={{
                    position: 'absolute',
                    top: '-0.8mm',
                    left: '-0.8mm',
                    width: '1.8mm',
                    height: '1.8mm',
                    borderTop: `1.5px solid ${theme.border}`,
                    borderLeft: `1.5px solid ${theme.border}`,
                    pointerEvents: 'none',
                    zIndex: 25,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '-0.8mm',
                    right: '-0.8mm',
                    width: '1.8mm',
                    height: '1.8mm',
                    borderBottom: `1.5px solid ${theme.border}`,
                    borderRight: `1.5px solid ${theme.border}`,
                    pointerEvents: 'none',
                    zIndex: 25,
                }}
            />

            {/* GSAP FLOATING PILL BADGE */}
            <div
                style={{
                    position: 'absolute',
                    top: '-2.4mm',
                    right: '1.5mm',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8mm',
                    backgroundColor: isSelected ? '#0f172a' : theme.badgeBg,
                    color: isSelected ? '#00f0ff' : theme.badgeText,
                    fontSize: '1.8mm',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '0.2mm 1.0mm',
                    borderRadius: '0.6mm',
                    border: isSelected ? '1px solid #00f0ff' : 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    zIndex: 30,
                    pointerEvents: 'auto',
                    whiteSpace: 'nowrap',
                }}
                title={
                    debugMeta?.formula ||
                    `${theme.label}: ${heightMm.toFixed(2)}mm`
                }
            >
                <span>#{index + 1}</span>
                <span>{theme.label}</span>
                <span
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        padding: '0.1mm 0.6mm',
                        borderRadius: '0.4mm',
                    }}
                >
                    {heightMm.toFixed(2)}mm
                </span>
                {!compactMode && (
                    <span
                        style={{
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: '1.6mm',
                        }}
                    >
                        Y:{startY.toFixed(1)}→{endY.toFixed(1)}mm
                    </span>
                )}
            </div>

            {/* SUB-ELEMENT BREAKDOWN (TABLE ROWS, LIST ITEMS, LINE COUNTS) */}
            {showSubElements && debugMeta && (
                <>
                    {/* Table Row Badges */}
                    {debugMeta.rows && debugMeta.rows.length > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                left: '-3.2mm',
                                top: '4mm',
                                bottom: '1mm',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-around',
                                pointerEvents: 'none',
                                zIndex: 30,
                            }}
                        >
                            {debugMeta.rows.map((row) => (
                                <span
                                    key={row.index}
                                    style={{
                                        fontSize: '1.5mm',
                                        fontWeight: 600,
                                        fontFamily: 'monospace',
                                        color: '#d97706',
                                        backgroundColor:
                                            'rgba(255, 255, 255, 0.95)',
                                        padding: '0.1mm 0.5mm',
                                        borderRadius: '0.3mm',
                                        border: '0.5px solid #d97706',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    }}
                                    title={`Fila ${row.index}: ${row.heightMm.toFixed(2)}mm (${row.textLength} chars)`}
                                >
                                    R{row.index}:{row.heightMm.toFixed(1)}mm
                                </span>
                            ))}
                        </div>
                    )}

                    {/* List Item Badges */}
                    {debugMeta.items && debugMeta.items.length > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                left: '-3.2mm',
                                top: '2mm',
                                bottom: '1mm',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-around',
                                pointerEvents: 'none',
                                zIndex: 30,
                            }}
                        >
                            {debugMeta.items.map((item) => (
                                <span
                                    key={item.index}
                                    style={{
                                        fontSize: '1.5mm',
                                        fontWeight: 600,
                                        fontFamily: 'monospace',
                                        color: '#65a30d',
                                        backgroundColor:
                                            'rgba(255, 255, 255, 0.95)',
                                        padding: '0.1mm 0.5mm',
                                        borderRadius: '0.3mm',
                                        border: '0.5px solid #65a30d',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={`Elemento ${item.index}: ${item.heightMm.toFixed(2)}mm (${item.lineCount} lín)`}
                                >
                                    L{item.index}:{item.heightMm.toFixed(1)}mm
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Paragraph Line Indicator Pill */}
                    {debugMeta.lineCount && debugMeta.lineCount > 1 && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-2.0mm',
                                right: '1.5mm',
                                fontSize: '1.6mm',
                                fontWeight: 600,
                                fontFamily: 'monospace',
                                color: '#0891b2',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                padding: '0.1mm 0.6mm',
                                borderRadius: '0.4mm',
                                border: '0.5px solid #0891b2',
                                zIndex: 28,
                                pointerEvents: 'none',
                            }}
                        >
                            {debugMeta.lineCount} líneas @{' '}
                            {debugMeta.fontLineHeightMm?.toFixed(2) || '3.53'}mm
                        </div>
                    )}
                </>
            )}

            {/* EXPANDABLE HOVER / SELECTED METRIC INSPECTOR POPUP */}
            {(isSelected || (isHovered && !compactMode)) && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        zIndex: 100,
                        backgroundColor: 'rgba(15, 23, 42, 0.96)',
                        backdropFilter: 'blur(6px)',
                        color: '#f8fafc',
                        padding: '1.5mm 2.2mm',
                        borderRadius: '1.0mm',
                        border: `1px solid ${isSelected ? '#00f0ff' : theme.border}`,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        fontSize: '1.85mm',
                        fontFamily: 'monospace',
                        minWidth: '60mm',
                        maxWidth: '120mm',
                        marginTop: '1.2mm',
                        pointerEvents: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.8mm',
                        }}
                    >
                        <strong
                            style={{
                                color: isSelected ? '#00f0ff' : theme.border,
                            }}
                        >
                            [{theme.label}] ID: {block.id}
                        </strong>
                        <span style={{ color: '#94a3b8', fontSize: '1.7mm' }}>
                            Pág {(debugMeta?.pageIndex ?? 0) + 1}
                        </span>
                    </div>

                    <div style={{ color: '#e2e8f0', marginBottom: '0.6mm' }}>
                        {debugMeta?.formula ||
                            `Alto Calculado: ${heightMm.toFixed(2)}mm`}
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.8mm',
                            borderTop: '0.5px solid rgba(255, 255, 255, 0.12)',
                            paddingTop: '0.8mm',
                            marginTop: '0.8mm',
                            color: '#94a3b8',
                        }}
                    >
                        <div>
                            Y Inicio:{' '}
                            <span style={{ color: '#f8fafc' }}>
                                {startY.toFixed(2)}mm
                            </span>
                        </div>
                        <div>
                            Y Fin:{' '}
                            <span style={{ color: '#f8fafc' }}>
                                {endY.toFixed(2)}mm
                            </span>
                        </div>
                        {debugMeta?.charsCount !== undefined && (
                            <div>
                                Caracteres:{' '}
                                <span style={{ color: '#f8fafc' }}>
                                    {debugMeta.charsCount}
                                </span>
                            </div>
                        )}
                        {debugMeta?.lineCount !== undefined && (
                            <div>
                                Líneas:{' '}
                                <span style={{ color: '#f8fafc' }}>
                                    {debugMeta.lineCount}
                                </span>
                            </div>
                        )}
                        {debugMeta?.keepWithNext && (
                            <div
                                style={{
                                    gridColumn: 'span 2',
                                    color: '#f59e0b',
                                }}
                            >
                                ⚠️ keep_with_next activo (requiere +
                                {debugMeta.minNextHeightMm?.toFixed(2) ||
                                    '7.06'}
                                mm)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BLOCK CONTENT */}
            {children}
        </div>
    );
}
