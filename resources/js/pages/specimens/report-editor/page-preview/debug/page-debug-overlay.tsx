import React from 'react';
import { useDebugReport } from './debug-context';
import type { MeasuredBlock } from './types';

interface PageDebugOverlayProps {
    pageNum: number;
    totalPages: number;
    pageBlocks: MeasuredBlock[];
    pageWidthMm?: number; // default 215.9mm
    pageHeightMm?: number; // default 279.4mm
    marginTopMm?: number; // default 12.0mm
    marginBottomMm?: number; // default 12.0mm
    marginLeftMm?: number; // default 15.0mm
    marginRightMm?: number; // default 15.0mm
    maxBodyHeightMm?: number; // default 212.79mm
    headerHeightMm?: number; // default 27.0mm
    headerMarginBottomMm?: number; // default 2.5mm
    footerHeightMm?: number; // default 20.11mm
    footerBottomMm?: number; // default 5.0mm
}

export function PageDebugOverlay({
    pageNum,
    totalPages,
    pageBlocks,
    pageWidthMm = 215.9,
    pageHeightMm = 279.4,
    marginTopMm = 12.0,
    marginBottomMm = 12.0,
    marginLeftMm = 15.0,
    marginRightMm = 15.0,
    maxBodyHeightMm = 212.79,
    headerHeightMm = 27.0,
    headerMarginBottomMm = 2.5,
    footerHeightMm = 20.11,
    footerBottomMm = 5.0,
}: PageDebugOverlayProps) {
    const {
        isEnvDebugReportEnabled,
        showMaster,
        showMargins,
        showRulers,
        showPageGauges,
        compactMode,
    } = useDebugReport();

    if (!isEnvDebugReportEnabled || !showMaster) {
        return null;
    }

    const usableWidthMm = pageWidthMm - marginLeftMm - marginRightMm;
    const totalUsedHeightMm = pageBlocks.reduce(
        (acc, b) => acc + (b.height || 0),
        0,
    );
    const remainingHeightMm = Math.max(0, maxBodyHeightMm - totalUsedHeightMm);
    const usagePercent = Math.min(
        100,
        (totalUsedHeightMm / maxBodyHeightMm) * 100,
    );
    const isOverflow = totalUsedHeightMm > maxBodyHeightMm + 0.05;
    const isNearLimit = usagePercent >= 90 && !isOverflow;

    const statusColor = isOverflow
        ? '#ef4444' // Crimson
        : isNearLimit
          ? '#f59e0b' // Amber
          : '#10b981'; // Emerald

    const statusBg = isOverflow
        ? 'rgba(239, 68, 68, 0.15)'
        : isNearLimit
          ? 'rgba(245, 158, 11, 0.15)'
          : 'rgba(16, 185, 129, 0.15)';

    const rulerTicks = [];
    const step = 10; // mm

    for (let y = 0; y <= pageHeightMm; y += step) {
        const isMajor = y % 50 === 0;
        const isBodyLimit =
            Math.abs(
                y -
                    (marginTopMm +
                        headerHeightMm +
                        headerMarginBottomMm +
                        maxBodyHeightMm),
            ) < 1;
        rulerTicks.push({
            y,
            isMajor,
            isBodyLimit,
        });
    }

    return (
        <div
            className="pointer-events-none absolute inset-0 z-50 overflow-visible font-mono select-none"
            style={{
                width: `${pageWidthMm}mm`,
                height: `${pageHeightMm}mm`,
            }}
            aria-hidden="true"
        >
            {/* 1. MARGIN GUIDES & SHADING */}
            {showMargins && (
                <>
                    {/* Left Margin Shading */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: `${marginLeftMm}mm`,
                            background:
                                'repeating-linear-gradient(45deg, rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.04) 2mm, rgba(59, 130, 246, 0.09) 2mm, rgba(59, 130, 246, 0.09) 4mm)',
                            borderRight: '1px dashed rgba(59, 130, 246, 0.5)',
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform:
                                    'translate(-50%, -50%) rotate(-90deg)',
                                fontSize: '2.3mm',
                                fontWeight: 700,
                                color: '#2563eb',
                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                padding: '0.4mm 1.2mm',
                                borderRadius: '0.6mm',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            MARGEN IZQ: {marginLeftMm.toFixed(1)}mm
                        </span>
                    </div>

                    {/* Right Margin Shading */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: `${marginRightMm}mm`,
                            background:
                                'repeating-linear-gradient(45deg, rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.04) 2mm, rgba(59, 130, 246, 0.09) 2mm, rgba(59, 130, 246, 0.09) 4mm)',
                            borderLeft: '1px dashed rgba(59, 130, 246, 0.5)',
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform:
                                    'translate(-50%, -50%) rotate(90deg)',
                                fontSize: '2.3mm',
                                fontWeight: 700,
                                color: '#2563eb',
                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                padding: '0.4mm 1.2mm',
                                borderRadius: '0.6mm',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            MARGEN DER: {marginRightMm.toFixed(1)}mm
                        </span>
                    </div>

                    {/* Top Margin Shading */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: `${marginLeftMm}mm`,
                            right: `${marginRightMm}mm`,
                            height: `${marginTopMm}mm`,
                            background:
                                'repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.04), rgba(168, 85, 247, 0.04) 2mm, rgba(168, 85, 247, 0.08) 2mm, rgba(168, 85, 247, 0.08) 4mm)',
                            borderBottom: '1px dashed rgba(168, 85, 247, 0.5)',
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '2.1mm',
                                fontWeight: 700,
                                color: '#7e22ce',
                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                padding: '0.3mm 1.2mm',
                                borderRadius: '0.6mm',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            MARGEN SUP: {marginTopMm.toFixed(1)}mm | ANCHO ÚTIL:{' '}
                            {usableWidthMm.toFixed(1)}mm
                        </span>
                    </div>

                    {/* Bottom Margin Shading */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: `${marginLeftMm}mm`,
                            right: `${marginRightMm}mm`,
                            height: `${marginBottomMm}mm`,
                            background:
                                'repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.04), rgba(168, 85, 247, 0.04) 2mm, rgba(168, 85, 247, 0.08) 2mm, rgba(168, 85, 247, 0.08) 4mm)',
                            borderTop: '1px dashed rgba(168, 85, 247, 0.5)',
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '2.1mm',
                                fontWeight: 700,
                                color: '#7e22ce',
                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                padding: '0.3mm 1.2mm',
                                borderRadius: '0.6mm',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            MARGEN INF: {marginBottomMm.toFixed(1)}mm
                        </span>
                    </div>
                </>
            )}

            {/* 2. GSAP SCROLLTRIGGER BOUNDARY MARKERS */}
            {/* Header Boundary Marker */}
            <div
                style={{
                    position: 'absolute',
                    top: `${marginTopMm + headerHeightMm}mm`,
                    left: `${marginLeftMm}mm`,
                    right: `${marginRightMm}mm`,
                    height: '0px',
                    borderTop: '1.2px dashed #06b6d4',
                    zIndex: 20,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        right: '1mm',
                        bottom: '1mm',
                        fontSize: '2.0mm',
                        fontWeight: 700,
                        color: '#0891b2',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '0.2mm 0.8mm',
                        borderRadius: '0.4mm',
                        border: '1px solid #06b6d4',
                    }}
                >
                    ▲ ENCABEZADO ({headerHeightMm.toFixed(1)}mm +{' '}
                    {headerMarginBottomMm.toFixed(1)}mm mb)
                </span>
            </div>

            {/* Body Content Area Start Marker */}
            <div
                style={{
                    position: 'absolute',
                    top: `${marginTopMm + headerHeightMm + headerMarginBottomMm}mm`,
                    left: `${marginLeftMm}mm`,
                    right: `${marginRightMm}mm`,
                    height: '0px',
                    borderTop: '1px solid #10b981',
                    zIndex: 20,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        left: '1mm',
                        bottom: '0.8mm',
                        fontSize: '1.9mm',
                        fontWeight: 700,
                        color: '#059669',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '0.2mm 0.8mm',
                        borderRadius: '0.4mm',
                        border: '1px solid #10b981',
                    }}
                >
                    [START CUERPO: 0.00mm]
                </span>
            </div>

            {/* Body Content Area Max Height Marker (212.79mm) */}
            <div
                style={{
                    position: 'absolute',
                    top: `${marginTopMm + headerHeightMm + headerMarginBottomMm + maxBodyHeightMm}mm`,
                    left: `${marginLeftMm}mm`,
                    right: `${marginRightMm}mm`,
                    height: '0px',
                    borderTop: '1.5px dashed #ef4444',
                    zIndex: 20,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        left: '1mm',
                        top: '0.8mm',
                        fontSize: '2.0mm',
                        fontWeight: 700,
                        color: '#dc2626',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '0.2mm 0.8mm',
                        borderRadius: '0.4mm',
                        border: '1px solid #ef4444',
                    }}
                >
                    [LÍMITE MÁXIMO CUERPO: {maxBodyHeightMm.toFixed(2)}mm]
                </span>
            </div>

            {/* Footer Zone Marker */}
            <div
                style={{
                    position: 'absolute',
                    bottom: `${footerBottomMm + footerHeightMm}mm`,
                    left: `${marginLeftMm}mm`,
                    right: `${marginRightMm}mm`,
                    height: '0px',
                    borderTop: '1.2px dashed #6366f1',
                    zIndex: 20,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        right: '1mm',
                        bottom: '1mm',
                        fontSize: '2.0mm',
                        fontWeight: 700,
                        color: '#4f46e5',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '0.2mm 0.8mm',
                        borderRadius: '0.4mm',
                        border: '1px solid #6366f1',
                    }}
                >
                    ▼ PIE DE PÁGINA ({footerHeightMm.toFixed(2)}mm @ bottom{' '}
                    {footerBottomMm.toFixed(1)}mm)
                </span>
            </div>

            {/* 3. VERTICAL MILLIMETER RULER (GSAP STYLE) */}
            {showRulers && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '4.5mm',
                        borderRight: '1px solid rgba(15, 23, 42, 0.3)',
                        backgroundColor: 'rgba(248, 250, 252, 0.85)',
                        zIndex: 40,
                    }}
                >
                    {rulerTicks.map((tick) => (
                        <div
                            key={tick.y}
                            style={{
                                position: 'absolute',
                                top: `${tick.y}mm`,
                                left: 0,
                                width: '100%',
                                height: '1px',
                                backgroundColor: tick.isBodyLimit
                                    ? '#ef4444'
                                    : tick.isMajor
                                      ? 'rgba(15, 23, 42, 0.6)'
                                      : 'rgba(15, 23, 42, 0.25)',
                            }}
                        >
                            {tick.isMajor && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: '5mm',
                                        top: '-1.4mm',
                                        fontSize: '1.8mm',
                                        fontWeight: 600,
                                        color: '#475569',
                                        backgroundColor:
                                            'rgba(255, 255, 255, 0.9)',
                                        padding: '0.1mm 0.5mm',
                                        borderRadius: '0.3mm',
                                    }}
                                >
                                    {tick.y}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 4. PAGE CAPACITY GAUGE HUD (TOP RIGHT CORNER) */}
            {showPageGauges && (
                <div
                    style={{
                        position: 'absolute',
                        top: '2mm',
                        right: '2mm',
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(4px)',
                        color: '#f8fafc',
                        padding: compactMode ? '0.8mm 1.5mm' : '1.4mm 2.2mm',
                        borderRadius: '1.2mm',
                        border: `1px solid ${statusColor}`,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                        zIndex: 60,
                        minWidth: compactMode ? 'auto' : '52mm',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '2mm',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.2mm',
                            }}
                        >
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: '2mm',
                                    height: '2mm',
                                    borderRadius: '50%',
                                    backgroundColor: statusColor,
                                    boxShadow: `0 0 4px ${statusColor}`,
                                }}
                            />
                            <strong
                                style={{ fontSize: '2.4mm', color: '#38bdf8' }}
                            >
                                PÁG {pageNum}/{totalPages}
                            </strong>
                        </div>
                        <span
                            style={{
                                fontSize: '2.0mm',
                                fontWeight: 700,
                                color: statusColor,
                                backgroundColor: statusBg,
                                padding: '0.2mm 1.0mm',
                                borderRadius: '0.6mm',
                                border: `0.5px solid ${statusColor}`,
                            }}
                        >
                            {isOverflow
                                ? 'OVERFLOW'
                                : `${usagePercent.toFixed(1)}%`}
                        </span>
                    </div>

                    {!compactMode && (
                        <>
                            {/* Capacity Progress Bar */}
                            <div
                                style={{
                                    marginTop: '1.2mm',
                                    width: '100%',
                                    height: '1.6mm',
                                    backgroundColor:
                                        'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '0.8mm',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${Math.min(100, usagePercent)}%`,
                                        height: '100%',
                                        backgroundColor: statusColor,
                                        transition: 'width 0.2s ease',
                                    }}
                                />
                            </div>

                            {/* Details Metrics */}
                            <div
                                style={{
                                    marginTop: '1.2mm',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1mm',
                                    fontSize: '1.85mm',
                                    color: '#94a3b8',
                                }}
                            >
                                <div>
                                    USADO:{' '}
                                    <strong style={{ color: '#f1f5f9' }}>
                                        {totalUsedHeightMm.toFixed(2)}mm
                                    </strong>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    LIBRE:{' '}
                                    <strong
                                        style={{
                                            color: isOverflow
                                                ? '#ef4444'
                                                : '#10b981',
                                        }}
                                    >
                                        {remainingHeightMm.toFixed(2)}mm
                                    </strong>
                                </div>
                                <div>
                                    BLOQUES:{' '}
                                    <strong style={{ color: '#f1f5f9' }}>
                                        {pageBlocks.length}
                                    </strong>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    MÁX:{' '}
                                    <strong style={{ color: '#94a3b8' }}>
                                        {maxBodyHeightMm.toFixed(1)}mm
                                    </strong>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
