import { Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import type { StickerType } from './types';

// GF(256) Math for Reed-Solomon Error Correction
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

let gfVal = 1;

for (let i = 0; i < 255; i++) {
    EXP[i] = gfVal;
    EXP[i + 255] = gfVal;
    LOG[gfVal] = i;
    gfVal <<= 1;

    if (gfVal & 256) {
        gfVal ^= 285;
    }
}

function gmul(a: number, b: number): number {
    if (a === 0 || b === 0) {
        return 0;
    }

    return EXP[LOG[a] + LOG[b]];
}

function rsCompute(data: Uint8Array, degree: number): Uint8Array {
    let poly = [1];

    for (let i = 0; i < degree; i++) {
        const next = new Array(poly.length + 1).fill(0);

        for (let j = 0; j < poly.length; j++) {
            next[j] ^= gmul(poly[j], EXP[i]);
            next[j + 1] ^= poly[j];
        }

        poly = next;
    }

    const res = new Uint8Array(degree);

    for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ res[0];

        for (let j = 0; j < degree - 1; j++) {
            res[j] = res[j + 1] ^ gmul(poly[j + 1], factor);
        }

        res[degree - 1] = gmul(poly[degree], factor);
    }

    return res;
}

export function generateQRMatrix(text: string): number[][] {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);

    let ver = 2;
    let dataCap = 34;
    let ecCap = 10;

    if (textBytes.length > 53) {
        ver = 4;
        dataCap = 78;
        ecCap = 22;
    } else if (textBytes.length > 32) {
        ver = 3;
        dataCap = 55;
        ecCap = 15;
    }

    const size = ver * 4 + 17;
    const bits: number[] = [];

    function pushBits(v: number, len: number) {
        for (let i = len - 1; i >= 0; i--) {
            bits.push((v >> i) & 1);
        }
    }

    pushBits(0b0100, 4); // Byte mode
    pushBits(textBytes.length, 8); // Length

    for (let i = 0; i < textBytes.length; i++) {
        pushBits(textBytes[i], 8);
    }

    const termLen = Math.min(4, dataCap * 8 - bits.length);
    pushBits(0, termLen);

    while (bits.length % 8 !== 0) {
        bits.push(0);
    }

    const padBytes = [0xec, 0x11];
    let padIdx = 0;

    while (bits.length < dataCap * 8) {
        pushBits(padBytes[padIdx % 2], 8);
        padIdx++;
    }

    const dataCodewords = new Uint8Array(dataCap);

    for (let i = 0; i < dataCap; i++) {
        let b = 0;

        for (let j = 0; j < 8; j++) {
            b = (b << 1) | bits[i * 8 + j];
        }

        dataCodewords[i] = b;
    }

    const ecCodewords = rsCompute(dataCodewords, ecCap);
    const allCodewords = new Uint8Array(dataCap + ecCap);
    allCodewords.set(dataCodewords, 0);
    allCodewords.set(ecCodewords, dataCap);

    const mat: (number | null)[][] = Array.from({ length: size }, () =>
        new Array(size).fill(null),
    );
    const isFunc: boolean[][] = Array.from({ length: size }, () =>
        new Array(size).fill(false),
    );

    function setModule(r: number, c: number, v: number) {
        mat[r][c] = v;
        isFunc[r][c] = true;
    }

    function addFinder(row: number, col: number) {
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
                const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                setModule(row + r, col + c, isBorder || isInner ? 1 : 0);
            }
        }

        for (let i = -1; i <= 7; i++) {
            for (let j = -1; j <= 7; j++) {
                if (i === -1 || i === 7 || j === -1 || j === 7) {
                    const r = row + i;
                    const c = col + j;

                    if (r >= 0 && r < size && c >= 0 && c < size) {
                        setModule(r, c, 0);
                    }
                }
            }
        }
    }

    addFinder(0, 0);
    addFinder(0, size - 7);
    addFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
        setModule(6, i, i % 2 === 0 ? 1 : 0);
        setModule(i, 6, i % 2 === 0 ? 1 : 0);
    }

    const alignPos = ver === 2 ? [18] : ver === 3 ? [22] : [26];

    for (const r of alignPos) {
        for (const c of alignPos) {
            if (mat[r][c] === null) {
                for (let i = -2; i <= 2; i++) {
                    for (let j = -2; j <= 2; j++) {
                        const isBorder = Math.abs(i) === 2 || Math.abs(j) === 2;
                        const isCenter = i === 0 && j === 0;
                        setModule(r + i, c + j, isBorder || isCenter ? 1 : 0);
                    }
                }
            }
        }
    }

    setModule(4 * ver + 9, 8, 1);

    for (let i = 0; i < 9; i++) {
        if (i < size) {
            isFunc[8][i] = true;
            isFunc[i][8] = true;
        }
    }

    for (let i = size - 8; i < size; i++) {
        isFunc[8][i] = true;
        isFunc[i][8] = true;
    }

    let bitIdx = 0;
    const allBits: number[] = [];

    for (let i = 0; i < allCodewords.length; i++) {
        for (let j = 7; j >= 0; j--) {
            allBits.push((allCodewords[i] >> j) & 1);
        }
    }

    let right = size - 1;
    let upward = true;

    while (right > 0) {
        if (right === 6) {
            right--;
        }

        for (let vert = 0; vert < size; vert++) {
            const r = upward ? size - 1 - vert : vert;

            for (let colOffset = 0; colOffset < 2; colOffset++) {
                const c = right - colOffset;

                if (!isFunc[r][c]) {
                    const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
                    const mask = (r + c) % 2 === 0 ? 1 : 0;
                    mat[r][c] = bit ^ mask;
                }
            }
        }

        upward = !upward;
        right -= 2;
    }

    const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
    const pos1 = [
        [8, 0],
        [8, 1],
        [8, 2],
        [8, 3],
        [8, 4],
        [8, 5],
        [8, 7],
        [8, 8],
        [7, 8],
        [5, 8],
        [4, 8],
        [3, 8],
        [2, 8],
        [1, 8],
        [0, 8],
    ];

    for (let i = 0; i < 15; i++) {
        mat[pos1[i][0]][pos1[i][1]] = formatBits[i];
    }

    for (let i = 0; i < 7; i++) {
        mat[size - 1 - i][8] = formatBits[i];
    }

    for (let i = 0; i < 8; i++) {
        mat[8][size - 8 + i] = formatBits[7 + i];
    }

    return mat.map((row) => row.map((c) => (c === 1 ? 1 : 0)));
}

export function generateQRSvg(text: string): string {
    const mat = generateQRMatrix(text);
    const size = mat.length;
    let rects = '';

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (mat[r][c]) {
                rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000000"/>`;
            }
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" width="100%" height="100%"><rect width="${size}" height="${size}" fill="#ffffff"/>${rects}</svg>`;
}

export function splitPatientName(fullName: string): [string, string] {
    const trimmed = fullName.trim();

    if (!trimmed) {
        return ['', ''];
    }

    const parts = trimmed.split(/\s+/);
    const count = parts.length;

    if (count <= 1) {
        return [parts[0] || '', ''];
    }

    if (count === 2) {
        return [parts[0], parts[1]];
    }

    const half = Math.ceil(count / 2);
    const line1 = parts.slice(0, half).join(' ');
    const line2 = parts.slice(half).join(' ');

    return [line1, line2];
}

export function formatShortPatientName(fullName: string): string {
    const trimmed = fullName.trim();

    if (!trimmed) {
        return '';
    }

    const parts = trimmed.split(/\s+/);
    const count = parts.length;

    if (count <= 2) {
        return parts.join(' ');
    }

    if (count === 3) {
        return `${parts[0]} ${parts[1]}`;
    }

    return `${parts[0]} ${parts[2]}`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function ShadowRootHost({ html }: { html: string }) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<ShadowRoot | null>(null);

    useEffect(() => {
        if (!hostRef.current) {
            return;
        }

        if (!shadowRef.current) {
            shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
        }

        shadowRef.current.innerHTML = html;
    }, [html]);

    return <div ref={hostRef} className="inline-block" />;
}

export interface StickerLivePreviewProps {
    type: StickerType;
    laboratoryName: string;
    biopsyNumber?: string;
    markerName?: string;
    cuttingCode?: string;
    sequenceCode?: string;
    patientName?: string;
}

export default function StickerLivePreview({
    type,
    laboratoryName,
    biopsyNumber,
    markerName,
    cuttingCode,
    sequenceCode = 'CX-2682-11-2026',
    patientName = 'Ana Carlota Reyes',
}: StickerLivePreviewProps) {
    const resolvedType =
        type === 'frasco' || type === 'corte' ? 'muestra' : type;
    const lab = laboratoryName.trim() || 'Laboratorio Patolab';
    const biopsy = biopsyNumber?.trim() || '';
    const marker = markerName?.trim() || '';
    const cutting =
        cuttingCode && cuttingCode !== 'none'
            ? cuttingCode === 'all'
                ? 'A'
                : cuttingCode
            : undefined;

    let stickerHtml = '';

    if (resolvedType === 'casette') {
        const shortPatient = formatShortPatientName(patientName);
        const cassetteLetter = cutting || 'A';

        stickerHtml = `
<style>
@font-face {
    font-family: 'Arial Narrow';
    src: url('/fonts/arialnarrow.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'Arial Narrow';
    src: url('/fonts/arialnarrow.ttf') format('truetype');
    font-weight: bold;
    font-style: normal;
}
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Arial Narrow', 'Nimbus Sans L', Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
:host {
    display: inline-block;
}
.cassette-page {
    width: 0.75in;
    height: 0.2in;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0.02in 0.015in 0.003in 0.015in;
    background: #ffffff;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.12);
    border-radius: 1px;
}
.cutting-col {
    width: 0.15in;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
.cutting-code-letter {
    font-size: 13pt;
    font-weight: bold;
    line-height: 0.9;
    color: #000000;
    text-align: center;
    text-transform: uppercase;
}
.info-col {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 0.015in;
    line-height: 1.05;
    overflow: hidden;
}
.brand-line {
    font-size: 3.3pt;
    font-weight: bold;
    letter-spacing: -0.15px;
    color: #000000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
}
.specimen-line {
    font-size: 4.8pt;
    font-weight: bold;
    letter-spacing: 0.1px;
    color: #000000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
}
.patient-line {
    font-size: 4.2pt;
    color: #000000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
<div class="cassette-page">
    <div class="cutting-col">
        <span class="cutting-code-letter">${escapeHtml(cassetteLetter.toUpperCase())}</span>
    </div>
    <div class="info-col">
        <div class="brand-line">${escapeHtml(lab.toUpperCase())}</div>
        <div class="specimen-line">${escapeHtml(sequenceCode.toUpperCase())}</div>
        <div class="patient-line">${escapeHtml(shortPatient)}</div>
    </div>
</div>
`;
    } else {
        const qrUrl = `/s/${encodeURIComponent(sequenceCode)}`;
        const qrSvg = generateQRSvg(qrUrl);
        const [line1, line2] = splitPatientName(patientName);

        stickerHtml = `
<style>
@font-face {
    font-family: 'Arial Narrow';
    src: url('/fonts/arialnarrow.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'Arial Narrow';
    src: url('/fonts/arialnarrow.ttf') format('truetype');
    font-weight: bold;
    font-style: normal;
}
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Arial Narrow', 'Nimbus Sans L', Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
:host {
    display: inline-block;
}
.sticker-page {
    width: 0.9375in;
    height: 0.9375in;
    position: relative;
    overflow: hidden;
    padding: 0.015in 0.015in 0.015in 0.015in;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
    color: #000000;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.12);
    border-radius: 2px;
}
.cutting-badge {
    position: absolute;
    top: 0.012in;
    right: 0.015in;
    font-size: 11.5pt;
    font-weight: bold;
    line-height: 0.82;
    color: #000000;
    text-align: right;
    text-transform: uppercase;
    z-index: 10;
}
.top-block {
    width: 100%;
    height: 0.46in;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    text-align: left;
    overflow: hidden;
}
.line-lab {
    font-size: 5.9pt;
    font-weight: bold;
    line-height: 1.0;
    letter-spacing: -0.15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: left;
    text-transform: uppercase;
}
.has-cutting .line-lab {
    max-width: 0.77in;
}
.line-biopsy {
    font-size: 7.2pt;
    font-weight: bold;
    line-height: 1.0;
    letter-spacing: -0.15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: left;
}
.line-sequence {
    font-size: 8.5pt;
    font-weight: bold;
    line-height: 1.0;
    letter-spacing: -0.25px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: left;
    text-transform: uppercase;
}
.line-marker {
    font-size: 7.0pt;
    font-weight: bold;
    line-height: 1.0;
    letter-spacing: -0.1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: left;
    text-transform: uppercase;
}
.bottom-block {
    width: 100%;
    height: 0.38in;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: flex-start;
    overflow: hidden;
}
.qr-wrapper {
    width: 0.34in;
    height: 0.34in;
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    margin: 0;
    padding: 0;
}
.qr-wrapper svg {
    width: 0.34in;
    height: 0.34in;
    display: block;
}
.patient-wrapper {
    flex: 1;
    margin-left: 0.035in;
    height: 0.34in;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    text-align: left;
}
.patient-line {
    font-size: 6.5pt;
    font-weight: bold;
    line-height: 1.1;
    letter-spacing: -0.25px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #000000;
}
</style>
<div class="sticker-page">
    ${cutting ? `<div class="cutting-badge">${escapeHtml(cutting.toUpperCase())}</div>` : ''}
    <div class="top-block ${cutting ? 'has-cutting' : ''}">
        <div class="line-lab">${escapeHtml(lab.toUpperCase())}</div>
        ${biopsy ? `<div class="line-biopsy">${escapeHtml(biopsy)}</div>` : ''}
        <div class="line-sequence">${escapeHtml(sequenceCode.toUpperCase())}</div>
        ${marker ? `<div class="line-marker">${escapeHtml(marker.toUpperCase())}</div>` : ''}
    </div>
    <div class="bottom-block">
        <div class="qr-wrapper">${qrSvg}</div>
        <div class="patient-wrapper">
            <div class="patient-line">${escapeHtml(line1)}</div>
            <div class="patient-line">${escapeHtml(line2)}</div>
        </div>
    </div>
</div>
`;
    }

    return (
        <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Vista Previa del Sticker en Vivo
                </span>
                <div className="flex items-center gap-1.5">
                    <Badge
                        variant="secondary"
                        className="text-[10px] font-medium"
                    >
                        {resolvedType === 'casette'
                            ? '0.75" × 0.20" (4.0×)'
                            : '0.94" × 0.94" (2.2×)'}
                    </Badge>
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                    >
                        Tiempo real
                    </Badge>
                </div>
            </div>

            {/* Thermal sticker preview stage */}
            <div className="flex min-h-[140px] items-center justify-center rounded-md border border-dashed border-border/70 bg-neutral-100/80 p-4 dark:bg-neutral-900/70">
                {resolvedType === 'casette' ? (
                    <div
                        className="relative flex items-center justify-center"
                        style={{ width: 288, height: 78 }}
                    >
                        <div
                            style={{
                                transform: 'scale(4.0)',
                                transformOrigin: 'center center',
                            }}
                        >
                            <ShadowRootHost html={stickerHtml} />
                        </div>
                    </div>
                ) : (
                    <div
                        className="relative flex items-center justify-center"
                        style={{ width: 200, height: 200 }}
                    >
                        <div
                            style={{
                                transform: 'scale(2.2)',
                                transformOrigin: 'center center',
                            }}
                        >
                            <ShadowRootHost html={stickerHtml} />
                        </div>
                    </div>
                )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
                Representación fiel con tipografía oficial Arial Narrow y
                dimensiones proporcionales para impresora térmica Zebra.
            </p>
        </div>
    );
}
