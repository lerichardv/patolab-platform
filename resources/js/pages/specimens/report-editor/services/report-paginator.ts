import type {
    MeasuredBlock,
    SectionOrderItem,
    Specimen,
    SpecimenReport,
} from '../types';
import {
    classifyBlock,
    estimatePatientCardHeight,
    getBlockLineHeight,
    getImageAspectRatio,
    getInnerHtml,
    getRootElementAttributes,
    isEmptyHtml,
    paginateList,
    paginateTable,
    parseHtmlToBlocks,
    splitHtmlIntoLines,
} from '../utils';

export interface ReportPaginateOptions {
    specimen: Specimen | any;
    report: Partial<SpecimenReport> | any;
    customer?: any;
    referrer?: any;
    isMicroscopyVisible?: boolean;
    pageContentHeight?: number;
    lineHeight?: number;
    maxCharsPerLine?: number;
}

export class ReportPaginator {
    public static readonly PAGE_CONTENT_HEIGHT = 205.0; // mm
    public static readonly LINE_HEIGHT = 3.53; // mm (8pt * 1.25)
    public static readonly MAX_CHARS_PER_LINE = 155;
    public static readonly SECTION_HEADER_HEIGHT = 7.94; // mm

    public static readonly DEFAULT_SECTIONS_ORDER: SectionOrderItem[] = [
        { key: 'clinical_details_html', order: 1, active: true },
        { key: 'diagnosis_html', order: 2, active: true },
        { key: 'macroscopy_html', order: 3, active: true },
        { key: 'microscopy_html', order: 4, active: true },
        { key: 'comments_notes_html', order: 5, active: true },
        { key: 'protocols_html', order: 6, active: true },
        { key: 'legend_html', order: 7, active: true },
        { key: 'open_text_html', order: 8, active: true },
    ];

    /**
     * Converts a 1-based index (1, 2, 3...) to Excel-style alphabetical column letter ('A', 'B', ... 'Z', 'AA'...)
     */
    public static indexToLetter(index: number): string {
        let letter = '';
        let tempIndex = index;

        while (tempIndex > 0) {
            const temp = (tempIndex - 1) % 26;
            letter = String.fromCharCode(65 + temp) + letter;
            tempIndex = Math.floor((tempIndex - temp - 1) / 26);
        }

        return letter;
    }

    /**
     * Converts an Excel-style alphabetical letter ('A', 'B', ...) to 1-based number (1, 2, ...)
     */
    public static letterToIndex(letter: string): number {
        let index = 0;
        const len = letter.length;

        for (let i = 0; i < len; i++) {
            index = index * 26 + (letter.charCodeAt(i) - 64);
        }

        return index;
    }

    /**
     * Checks if two string codes are alphabetically consecutive (e.g. 'A' and 'B', 'AA' and 'AB')
     */
    public static areTwoCodesConsecutive(
        code1: string,
        code2: string,
    ): boolean {
        const len1 = code1.length;
        const len2 = code2.length;

        if (len1 !== len2 || len1 === 0) {
            return false;
        }

        if (len1 > 1) {
            const pref1 = code1.substring(0, len1 - 1);
            const pref2 = code2.substring(0, len2 - 1);

            if (pref1 !== pref2) {
                return false;
            }
        }

        const lastChar1 = code1.charCodeAt(len1 - 1);
        const lastChar2 = code2.charCodeAt(len2 - 1);

        return lastChar2 === lastChar1 + 1;
    }

    /**
     * Builds cuttings summary block from cuttings array
     */
    public static buildCuttingsSummaryBlock(
        cuttingsList: any[],
        blockType: 'cuttings-summary' | 'new-cuttings-summary',
        blockId: string,
        prefix: string,
        maxCharsPerLine: number = ReportPaginator.MAX_CHARS_PER_LINE,
        lineHeight: number = ReportPaginator.LINE_HEIGHT,
    ): MeasuredBlock | null {
        if (!cuttingsList || cuttingsList.length === 0) {
            return null;
        }

        // Sort alphabetically (by length first, then natural comparison)
        const sorted = [...cuttingsList].sort((a: any, b: any) => {
            const codeA = a.code?.code || '';
            const codeB = b.code?.code || '';
            const lenA = codeA.length;
            const lenB = codeB.length;

            if (lenA !== lenB) {
                return lenA - lenB;
            }

            return codeA.localeCompare(codeB, undefined, {
                numeric: true,
                sensitivity: 'base',
            });
        });

        interface TempRun {
            startIndex: number;
            endIndex: number;
            description: string;
            prefix: string;
            items: any[];
        }

        const tempRuns: TempRun[] = [];
        sorted.forEach((cutting: any, idx: number) => {
            const desc = cutting.description || '';
            const cuttingPrefix = cutting.prefix?.prefix || '';

            if (
                tempRuns.length > 0 &&
                tempRuns[tempRuns.length - 1].description === desc &&
                tempRuns[tempRuns.length - 1].prefix === cuttingPrefix
            ) {
                const lastRun = tempRuns[tempRuns.length - 1];
                lastRun.endIndex = idx;
                lastRun.items.push(cutting);
            } else {
                tempRuns.push({
                    startIndex: idx,
                    endIndex: idx,
                    description: desc,
                    prefix: cuttingPrefix,
                    items: [cutting],
                });
            }
        });

        const groups: {
            startIndex: number;
            endIndex: number;
            description: string;
            prefix: string;
            totalCuts: number;
            count: number;
        }[] = [];

        tempRuns.forEach((run) => {
            const subGroups: any[][] = [];
            let currentSubGroup: any[] = [];

            run.items.forEach((item, idx) => {
                const realIdx = run.startIndex + idx;
                const code =
                    item.code?.code ||
                    ReportPaginator.indexToLetter(realIdx + 1);

                if (currentSubGroup.length === 0) {
                    currentSubGroup.push(item);
                } else {
                    const prevItem =
                        currentSubGroup[currentSubGroup.length - 1];
                    const prevRealIdx = run.startIndex + idx - 1;
                    const prevCode =
                        prevItem.code?.code ||
                        ReportPaginator.indexToLetter(prevRealIdx + 1);

                    if (
                        ReportPaginator.areTwoCodesConsecutive(prevCode, code)
                    ) {
                        currentSubGroup.push(item);
                    } else {
                        subGroups.push(currentSubGroup);
                        currentSubGroup = [item];
                    }
                }
            });

            if (currentSubGroup.length > 0) {
                subGroups.push(currentSubGroup);
            }

            let startIdxInCuttingsList = run.startIndex;
            subGroups.forEach((sub) => {
                const subCount = sub.length;
                let totalCuts = 0;
                sub.forEach((item) => {
                    totalCuts += item.number_of_cuttings ?? 0;
                });

                const endIdxInCuttingsList =
                    startIdxInCuttingsList + subCount - 1;

                groups.push({
                    startIndex: startIdxInCuttingsList,
                    endIndex: endIdxInCuttingsList,
                    description: run.description,
                    prefix: run.prefix,
                    totalCuts,
                    count: subCount,
                });

                startIdxInCuttingsList += subCount;
            });
        });

        const cutsList: string[] = [];
        groups.forEach((g) => {
            const startCutting = sorted[g.startIndex];
            const endCutting = sorted[g.endIndex];
            const startLetter =
                startCutting?.code?.code ||
                ReportPaginator.indexToLetter(g.startIndex + 1);
            const endLetter =
                endCutting?.code?.code ||
                ReportPaginator.indexToLetter(g.endIndex + 1);
            const label =
                g.startIndex === g.endIndex
                    ? startLetter
                    : `${startLetter}-${endLetter}`;

            const formattedDesc = g.description ? `${g.description} ` : '';
            const cutsVal =
                g.totalCuts === 0 && g.prefix
                    ? g.prefix
                    : g.prefix
                      ? `${g.prefix} ${g.totalCuts}`
                      : g.totalCuts;
            cutsList.push(`${label}) ${formattedDesc}${cutsVal}x${g.count}`);
        });

        const concatenatedCuts = `${prefix} ${cutsList.join('; ')}.`;
        const charsCount = concatenatedCuts.length;
        const lines = Math.max(1, Math.ceil(charsCount / maxCharsPerLine));
        const cutsHeight = lines * lineHeight + 2.0;

        return {
            type: blockType,
            height: cutsHeight,
            text: concatenatedCuts,
            id: blockId,
        };
    }

    /**
     * Primary entry point to paginate an entire report.
     */
    public static paginate(options: ReportPaginateOptions): MeasuredBlock[][] {
        const {
            specimen,
            report,
            customer,
            referrer,
            isMicroscopyVisible = false,
            pageContentHeight = ReportPaginator.PAGE_CONTENT_HEIGHT,
            lineHeight = ReportPaginator.LINE_HEIGHT,
            maxCharsPerLine = ReportPaginator.MAX_CHARS_PER_LINE,
        } = options;

        const effectiveCustomer = customer || specimen?.customer_relation;
        const effectiveReferrer = referrer || specimen?.referrer_relation;

        const pathologistsCount = specimen?.users?.length || 0;
        const rowsCount = Math.ceil(pathologistsCount / 2);
        const signatureHeight = rowsCount * 25.0; // 25mm per row

        let headingsToggles: Record<string, boolean> = {};

        if (report?.headings_toggles) {
            headingsToggles =
                typeof report.headings_toggles === 'string'
                    ? JSON.parse(report.headings_toggles)
                    : report.headings_toggles;
        }

        const patientCardHeight = estimatePatientCardHeight({
            customer_relation: effectiveCustomer,
            referrer_relation: effectiveReferrer,
            diagnosis: specimen?.diagnosis,
            anatomic_site: specimen?.anatomic_site,
        });

        const blocks: MeasuredBlock[] = [];

        // 1. Patient card block
        blocks.push({
            type: 'patient-card',
            height: patientCardHeight,
            id: 'patient-card',
        });

        let sectionsOrder: SectionOrderItem[] =
            ReportPaginator.DEFAULT_SECTIONS_ORDER;

        if (
            report?.sections_order &&
            Array.isArray(report.sections_order) &&
            report.sections_order.length > 0
        ) {
            sectionsOrder = [...report.sections_order];
        }

        sectionsOrder.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        sectionsOrder.forEach((section) => {
            const active = section.active !== false;

            if (!active) {
                return;
            }

            const showHeading = headingsToggles[section.key] ?? true;

            if (section.key === 'clinical_details_html') {
                const clinHtml = report?.clinical_details_html || '';

                if (!isEmptyHtml(clinHtml)) {
                    if (showHeading) {
                        blocks.push({
                            type: 'section-header',
                            title: 'DATOS CLÍNICOS',
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'clin-header',
                        });
                    }

                    const clinBlocks = parseHtmlToBlocks(clinHtml);
                    clinBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `clin-block-${idx}`;
                        blocks.push(b);
                    });
                }
            } else if (section.key === 'diagnosis_html') {
                const diagHtml =
                    report?.diagnosis_html || specimen?.diagnosis || '';

                if (!isEmptyHtml(diagHtml)) {
                    if (showHeading) {
                        blocks.push({
                            type: 'section-header',
                            title: 'DIAGNÓSTICO',
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'diag-header',
                        });
                    }

                    const diagBlocks = parseHtmlToBlocks(diagHtml);
                    diagBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `diag-block-${idx}`;
                        blocks.push(b);
                    });
                }
            } else if (section.key === 'macroscopy_html') {
                const macroHtml = report?.macroscopy_html || '';

                if (!isEmptyHtml(macroHtml)) {
                    if (showHeading) {
                        blocks.push({
                            type: 'section-header',
                            title: 'DESCRIPCIÓN MACROSCÓPICA',
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'macro-header',
                        });
                    }

                    const macroBlocks = parseHtmlToBlocks(macroHtml);
                    macroBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `macro-block-${idx}`;
                        blocks.push(b);
                    });
                }
            } else if (section.key === 'microscopy_html') {
                if (isMicroscopyVisible) {
                    const microHtml = report?.microscopy_html || '';

                    if (!isEmptyHtml(microHtml)) {
                        if (showHeading) {
                            blocks.push({
                                type: 'section-header',
                                title: 'DESCRIPCIÓN MICROSCÓPICA',
                                height: ReportPaginator.SECTION_HEADER_HEIGHT,
                                id: 'micro-header',
                            });
                        }

                        const microBlocks = parseHtmlToBlocks(microHtml);
                        microBlocks.forEach((bHtml, idx) => {
                            const b = classifyBlock(bHtml, maxCharsPerLine);
                            b.id = `micro-block-${idx}`;
                            blocks.push(b);
                        });
                    }
                }
            } else if (section.key === 'comments_notes_html') {
                const commHtml = report?.comments_notes_html || '';

                if (!isEmptyHtml(commHtml)) {
                    if (showHeading) {
                        blocks.push({
                            type: 'section-header',
                            title: 'COMENTARIOS Y NOTAS',
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'comm-header',
                        });
                    }

                    const commBlocks = parseHtmlToBlocks(commHtml);
                    commBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `comm-block-${idx}`;
                        blocks.push(b);
                    });
                }
            } else if (section.key === 'protocols_html') {
                const protHtml = report?.protocols_html || '';

                if (!isEmptyHtml(protHtml)) {
                    if (showHeading) {
                        blocks.push({
                            type: 'section-header',
                            title: 'PROTOCOLOS',
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'prot-header',
                        });
                    }

                    const protBlocks = parseHtmlToBlocks(protHtml);
                    protBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `prot-block-${idx}`;
                        blocks.push(b);
                    });
                }
            } else if (section.key === 'legend_html') {
                const legHtml = report?.legend_html || '';

                if (!isEmptyHtml(legHtml)) {
                    if (showHeading) {
                        blocks.push({
                            type: 'section-header',
                            title: 'LEYENDA',
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'leg-header',
                        });
                    }

                    const legBlocks = parseHtmlToBlocks(legHtml);
                    legBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `leg-block-${idx}`;
                        blocks.push(b);
                    });
                }
            } else if (section.key === 'open_text_html') {
                const openHtml = report?.open_text_html || '';

                if (!isEmptyHtml(openHtml)) {
                    if (showHeading) {
                        const openLabel =
                            report?.open_text_label || 'Texto Libre';
                        blocks.push({
                            type: 'section-header',
                            title: openLabel.toUpperCase(),
                            height: ReportPaginator.SECTION_HEADER_HEIGHT,
                            id: 'open-text-header',
                        });
                    }

                    const openBlocks = parseHtmlToBlocks(openHtml);
                    openBlocks.forEach((bHtml, idx) => {
                        const b = classifyBlock(bHtml, maxCharsPerLine);
                        b.id = `open-text-block-${idx}`;
                        blocks.push(b);
                    });
                }
            }
        });

        // Paginate the stream of blocks
        const computedPages = ReportPaginator.paginateBlocks(
            blocks,
            pageContentHeight,
            lineHeight,
            maxCharsPerLine,
        );

        if (computedPages.length === 0) {
            computedPages.push([
                {
                    id: 'patient-card',
                    type: 'patient-card',
                    height: patientCardHeight,
                },
            ]);
        }

        const lastPageIndex = computedPages.length - 1;
        let lastPageHeight = 0.0;
        computedPages[lastPageIndex].forEach((b) => {
            lastPageHeight += b.height;
        });

        const maxHeightForLastPage = pageContentHeight;

        if (signatureHeight > 0) {
            if (lastPageHeight + signatureHeight > maxHeightForLastPage) {
                computedPages.push([
                    {
                        id: 'signature',
                        type: 'signature',
                        height: signatureHeight,
                    },
                ]);
            } else {
                computedPages[lastPageIndex].push({
                    id: 'signature',
                    type: 'signature',
                    height: signatureHeight,
                });
            }
        }

        // Addendum pagination
        const addendumHtmlValue = report?.addendum_html || '';

        if (!isEmptyHtml(addendumHtmlValue)) {
            const addendumBlocks: MeasuredBlock[] = [];
            const showAddendumHeading =
                headingsToggles['addendum_html'] ?? true;

            if (showAddendumHeading) {
                addendumBlocks.push({
                    type: 'section-header',
                    title: 'Addendum',
                    height: ReportPaginator.SECTION_HEADER_HEIGHT,
                    id: 'addendum-header',
                });
            }

            const rawAddendumBlocks = parseHtmlToBlocks(addendumHtmlValue);
            rawAddendumBlocks.forEach((bHtml, idx) => {
                const b = classifyBlock(bHtml, maxCharsPerLine);
                b.id = `addendum-block-${idx}`;
                addendumBlocks.push(b);
            });

            const addendumPages = ReportPaginator.paginateBlocks(
                addendumBlocks,
                pageContentHeight,
                lineHeight,
                maxCharsPerLine,
            );
            addendumPages.forEach((aPage) => {
                computedPages.push(aPage);
            });
        }

        return computedPages;
    }

    /**
     * Slices and paginates an array of MeasuredBlocks into pages.
     */
    public static paginateBlocks(
        blocksList: MeasuredBlock[],
        pageContentHeight: number = ReportPaginator.PAGE_CONTENT_HEIGHT,
        lineHeight: number = ReportPaginator.LINE_HEIGHT,
        maxCharsPerLine: number = ReportPaginator.MAX_CHARS_PER_LINE,
    ): MeasuredBlock[][] {
        const pagesList: MeasuredBlock[][] = [];
        let currentPageList: MeasuredBlock[] = [];
        let currentHeightList = 0.0;

        for (let bIndex = 0; bIndex < blocksList.length; bIndex++) {
            const block = blocksList[bIndex];
            let maxHeightForPage = pageContentHeight;

            if (block.type === 'patient-card') {
                currentPageList.push(block);
                currentHeightList += block.height;
                continue;
            }

            if (block.type === 'section-header') {
                if (currentHeightList + block.height > maxHeightForPage) {
                    pagesList.push(currentPageList);
                    currentPageList = [];
                    currentHeightList = 0.0;
                    maxHeightForPage = pageContentHeight;
                }

                currentPageList.push(block);
                currentHeightList += block.height;
                continue;
            }

            if (block.type === 'page-break') {
                if (currentPageList.length > 0) {
                    pagesList.push(currentPageList);
                    currentPageList = [];
                    currentHeightList = 0.0;
                }

                continue;
            }

            if (block.type === 'heading') {
                const headingCost = block.height;
                let nextBlockStartsNewPage = false;

                // Keep with Next constraint
                if (bIndex + 1 < blocksList.length) {
                    const nextBlock = blocksList[bIndex + 1];
                    let minNextHeight = 2.0 * lineHeight;

                    if (nextBlock.type === 'image') {
                        minNextHeight = nextBlock.height;
                    } else if (nextBlock.type === 'heading') {
                        minNextHeight = nextBlock.height;
                    }

                    if (
                        currentHeightList + headingCost + minNextHeight >
                        maxHeightForPage
                    ) {
                        nextBlockStartsNewPage = true;
                    }
                }

                if (
                    currentHeightList + headingCost > maxHeightForPage ||
                    nextBlockStartsNewPage
                ) {
                    if (currentPageList.length > 0) {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                        maxHeightForPage = pageContentHeight;
                    }
                }

                currentPageList.push(block);
                currentHeightList += headingCost;
                continue;
            }

            if (block.type === 'image-grid') {
                const columns = block.columns || 2;
                const images = block.images;

                if (!images || images.length === 0) {
                    currentPageList.push({
                        id: `${block.id}-fallback`,
                        type: 'html',
                        html: block.html || '',
                        height: 5.3,
                    });
                    currentHeightList += 5.3;
                    continue;
                }

                const width = block.width || null;
                const usableWidth = width ? 185.9 * (width / 704) : 185.9;
                const gap = 1.5; // mm
                const slicedImages = images.slice(0, 4);
                const rowsRemaining: string[][] = [slicedImages];

                const rowHeights = rowsRemaining.map((rowImages) => {
                    let aspectSum = 0.0;
                    rowImages.forEach((imgTag: string) => {
                        const aspect = getImageAspectRatio(imgTag);

                        if (aspect > 0.0) {
                            aspectSum += 1.0 / aspect;
                        } else {
                            aspectSum += 1.0;
                        }
                    });

                    if (aspectSum <= 0) {
                        aspectSum = 1.0;
                    }

                    const N = rowImages.length;
                    const maxRowHeight =
                        N === 1
                            ? Math.min(120.0, usableWidth)
                            : usableWidth * 1.5;
                    const calculatedHeight =
                        (usableWidth - (N - 1) * gap) / aspectSum;

                    return Math.min(calculatedHeight, maxRowHeight);
                });

                const rowCaptionHeights = rowsRemaining.map((rowImages) => {
                    let maxCaptionHeight = 0.0;
                    const N = rowImages.length;
                    const colWidthMm = (usableWidth - (N - 1) * gap) / N;
                    const maxCharsForCaption = Math.max(
                        12,
                        Math.floor(colWidthMm / 1.5),
                    );

                    rowImages.forEach((imgTag: string) => {
                        const captionMatch =
                            imgTag.match(/data-caption=["']([^"']*)["']/i) ||
                            imgTag.match(/alt=["']([^"']*)["']/i);
                        const caption = captionMatch ? captionMatch[1] : '';
                        if (caption) {
                            const captionLines = Math.max(
                                1,
                                Math.ceil(caption.length / maxCharsForCaption),
                            );
                            const captionHeight = captionLines * 3.6 + 1.06;
                            if (captionHeight > maxCaptionHeight) {
                                maxCaptionHeight = captionHeight;
                            }
                        }
                    });

                    return maxCaptionHeight;
                });

                let rowIndex = 0;

                while (rowIndex < rowsRemaining.length) {
                    const remaining = maxHeightForPage - currentHeightList;
                    const minGridHeight =
                        rowHeights[rowIndex] +
                        rowCaptionHeights[rowIndex] +
                        2.0;

                    if (
                        remaining < minGridHeight &&
                        currentPageList.length > 0
                    ) {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                        continue;
                    }

                    let r = 0;

                    for (
                        let tempR = 1;
                        tempR <= rowsRemaining.length - rowIndex;
                        tempR++
                    ) {
                        let cost = 2.0;

                        for (let i = 0; i < tempR; i++) {
                            cost +=
                                rowHeights[rowIndex + i] +
                                rowCaptionHeights[rowIndex + i];

                            if (i > 0) {
                                cost += 1.5;
                            }
                        }

                        if (cost <= remaining) {
                            r = tempR;
                        } else {
                            break;
                        }
                    }

                    if (r === 0) {
                        if (currentPageList.length > 0) {
                            pagesList.push(currentPageList);
                            currentPageList = [];
                            currentHeightList = 0.0;
                            continue;
                        } else {
                            r = 1;
                        }
                    }

                    const sliceImages: string[] = [];

                    for (let i = 0; i < r; i++) {
                        const rowIdx = rowIndex + i;
                        const rowImages = rowsRemaining[rowIdx];
                        const H_j = rowHeights[rowIdx];

                        rowImages.forEach((imgTag) => {
                            const aspect = getImageAspectRatio(imgTag);
                            const widthMm = aspect > 0.0 ? H_j / aspect : H_j;
                            const styleRule = `height: ${H_j}mm; width: 100%; object-fit: cover; border-radius: 1.06mm;`;

                            let processedTag = imgTag;
                            const styleMatch = processedTag.match(
                                /style=["']([^"']*)["']/i,
                            );

                            if (styleMatch) {
                                processedTag = processedTag.replace(
                                    /style=["']([^"']*)["']/i,
                                    `style="${styleRule}"`,
                                );
                            } else {
                                processedTag = processedTag.replace(
                                    '<img',
                                    `<img style="${styleRule}"`,
                                );
                            }

                            let caption = '';
                            const capMatch =
                                imgTag.match(
                                    /data-caption=["']([^"']*)["']/i,
                                ) || imgTag.match(/alt=["']([^"']*)["']/i);
                            if (capMatch) {
                                caption = capMatch[1];
                            }

                            const captionHtml = caption
                                ? `<div class="gallery-image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2; width: 100%; word-break: break-word;">${caption}</div>`
                                : '';

                            const wrappedImg = `<div class="grid-image-container" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: ${widthMm}mm; max-width: 100%;">${processedTag}${captionHtml}</div>`;
                            sliceImages.push(wrappedImg);
                        });
                    }

                    const align = block.alignment || 'center';
                    const isLeft = align === 'left';
                    const isRight = align === 'right';
                    const marginLeft = isLeft ? '0' : 'auto';
                    const marginRight = isRight ? 'auto' : 'auto';
                    const styles = [
                        'display: flex',
                        'flex-wrap: nowrap',
                        `gap: ${gap}mm`,
                        `margin-left: ${marginLeft}`,
                        `margin-right: ${marginRight}`,
                    ];

                    if (width) {
                        styles.push(`width: ${width}px`);
                    }

                    const styleStr = styles.join('; ') + ';';

                    const sliceHtml = `<div data-type="image-grid" class="align-${align}" data-columns="${columns}" data-align="${align}"${width ? ` width="${width}"` : ''} style="${styleStr}">${sliceImages.join('')}</div>`;

                    let cost = 2.0;

                    for (let i = 0; i < r; i++) {
                        cost +=
                            rowHeights[rowIndex + i] +
                            rowCaptionHeights[rowIndex + i];

                        if (i > 0) {
                            cost += 1.5;
                        }
                    }

                    currentPageList.push({
                        id: `${block.id}-row-${rowIndex}-slice-${r}`,
                        type: 'html',
                        html: sliceHtml,
                        height: cost,
                    });

                    currentHeightList += cost;
                    rowIndex += r;
                }

                continue;
            }

            if (block.type === 'image') {
                if (currentHeightList + block.height > maxHeightForPage) {
                    pagesList.push(currentPageList);
                    currentPageList = [];
                    currentHeightList = 0.0;
                    maxHeightForPage = pageContentHeight;
                }

                currentPageList.push(block);
                currentHeightList += block.height;
                continue;
            }

            if (
                block.type === 'cuttings-summary' ||
                block.type === 'new-cuttings-summary'
            ) {
                if (currentHeightList + block.height > maxHeightForPage) {
                    pagesList.push(currentPageList);
                    currentPageList = [];
                    currentHeightList = 0.0;
                    maxHeightForPage = pageContentHeight;
                }

                currentPageList.push(block);
                currentHeightList += block.height;
                continue;
            }

            if (block.type === 'paragraph') {
                const paraInnerHtml = getInnerHtml(
                    block.html || '',
                    block.tag || 'p',
                );
                const lines = splitHtmlIntoLines(
                    paraInnerHtml,
                    maxCharsPerLine,
                );

                let i = 0;

                while (i < lines.length) {
                    const fontLineHeight = getBlockLineHeight(
                        block,
                        lineHeight,
                    );
                    const remaining = maxHeightForPage - currentHeightList;

                    if (remaining <= 0.5 * fontLineHeight) {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                        continue;
                    }

                    const linesToFit = Math.min(
                        Math.floor(remaining / fontLineHeight),
                        lines.length - i,
                    );

                    if (linesToFit <= 0) {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                        continue;
                    }

                    const slice = lines.slice(i, i + linesToFit);
                    const isLastSlice = i + linesToFit >= lines.length;
                    const classAttr = block.class || 'section-content';
                    const { style: originalStyle, extraAttrs } =
                        getRootElementAttributes(block.html || '');
                    let mergedStyle = originalStyle;
                    if (!isLastSlice) {
                        mergedStyle = mergedStyle
                            ? `${mergedStyle.trim().endsWith(';') ? mergedStyle : mergedStyle + ';'} margin-bottom: 0px;`
                            : 'margin-bottom: 0px;';
                    }
                    const styleAttrStr = mergedStyle
                        ? ` style="${mergedStyle}"`
                        : '';

                    const sliceHtml = `<${block.tag || 'p'} class="${classAttr}"${styleAttrStr}${extraAttrs}>${slice.join('')}</${block.tag || 'p'}>`;
                    const blockCost =
                        linesToFit * fontLineHeight +
                        (isLastSlice ? 1.98 : 0.0);

                    currentPageList.push({
                        id: `${block.id}-slice-${i}`,
                        type: 'html',
                        html: sliceHtml,
                        height: blockCost,
                    });

                    currentHeightList += blockCost;
                    i += linesToFit;
                }

                continue;
            }

            if (block.type === 'list') {
                const fontLineHeight = getBlockLineHeight(block, lineHeight);
                const listData = paginateList(
                    block.html || '',
                    maxCharsPerLine,
                    fontLineHeight,
                );
                const listItems = listData.items;
                const tag = listData.tag;

                let i = 0;
                let olStartIndex = 1;

                while (i < listItems.length) {
                    const remaining = maxHeightForPage - currentHeightList;

                    if (remaining <= 1.0 * fontLineHeight) {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                        continue;
                    }

                    const item = listItems[i];
                    const itemHtml = item.html;
                    const itemHeight = item.height;

                    if (itemHeight > remaining) {
                        if (currentHeightList === 0.0) {
                            const startAttr =
                                tag === 'ol' && olStartIndex > 1
                                    ? ` start="${olStartIndex}"`
                                    : '';
                            const listStyleAttr = listData.listStyleType
                                ? ` data-list-style-type="${listData.listStyleType}"`
                                : '';
                            const styleAttr = listData.styleAttr
                                ? ` style="${listData.styleAttr}"`
                                : '';
                            currentPageList.push({
                                id: `${block.id}-item-${i}`,
                                type: 'html',
                                html: `<${tag} class="section-content"${startAttr}${listStyleAttr}${styleAttr}>${itemHtml}</${tag}>`,
                                height: itemHeight + 1.98,
                            });
                            currentHeightList += itemHeight + 1.98;
                            i++;
                            olStartIndex++;
                        } else {
                            pagesList.push(currentPageList);
                            currentPageList = [];
                            currentHeightList = 0.0;
                        }
                    } else {
                        const itemsToFit: string[] = [];
                        let accumulatedHeight = 0.0;

                        while (i < listItems.length) {
                            const nextItem = listItems[i];
                            const nextItemHtml = nextItem.html;
                            const nextItemHeight = nextItem.height;

                            const isLastOfAll = i === listItems.length - 1;
                            const spacingOverhead = isLastOfAll ? 1.98 : 0.0;

                            if (
                                accumulatedHeight +
                                    nextItemHeight +
                                    spacingOverhead >
                                remaining
                            ) {
                                break;
                            }

                            itemsToFit.push(nextItemHtml);
                            accumulatedHeight += nextItemHeight;
                            i++;
                        }

                        if (itemsToFit.length > 0) {
                            const isLastOfAll = i >= listItems.length;
                            const cost =
                                accumulatedHeight + (isLastOfAll ? 1.98 : 0.0);

                            const startAttr =
                                tag === 'ol' && olStartIndex > 1
                                    ? ` start="${olStartIndex}"`
                                    : '';
                            const listStyleAttr = listData.listStyleType
                                ? ` data-list-style-type="${listData.listStyleType}"`
                                : '';
                            const styleAttr = listData.styleAttr
                                ? ` style="${listData.styleAttr}"`
                                : '';
                            currentPageList.push({
                                id: `${block.id}-items-${olStartIndex}`,
                                type: 'html',
                                html: `<${tag} class="section-content"${startAttr}${listStyleAttr}${styleAttr}>${itemsToFit.join(
                                    '',
                                )}</${tag}>`,
                                height: cost,
                            });
                            currentHeightList += cost;
                            olStartIndex += itemsToFit.length;
                        } else {
                            pagesList.push(currentPageList);
                            currentPageList = [];
                            currentHeightList = 0.0;
                        }
                    }
                }

                continue;
            }

            if (block.type === 'table') {
                const fontLineHeight = 3.97;
                const tableData = paginateTable(
                    block.html || '',
                    maxCharsPerLine,
                    fontLineHeight,
                );
                const headerHtml = tableData.headerHtml;
                const headerHeight = tableData.headerHeight;
                const rows = tableData.rows;

                let i = 0;

                while (i < rows.length) {
                    const remaining = maxHeightForPage - currentHeightList;
                    const minNeededForFirstRow =
                        headerHeight +
                        (rows[i]?.height || 6.0) +
                        (i === 0 && currentHeightList > 0.0 ? 1.32 : 0.0);

                    if (
                        remaining < minNeededForFirstRow &&
                        currentPageList.length > 0
                    ) {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                        continue;
                    }

                    const tableTopMargin =
                        i === 0 && currentHeightList > 0.0 ? 1.32 : 0.0;
                    const remainingForRows =
                        remaining - headerHeight - tableTopMargin;

                    const rowsToFit: string[] = [];
                    let accumulatedHeight = 0.0;

                    while (i < rows.length) {
                        const row = rows[i];
                        const rowHeight = row.height;

                        const isLastRow = i === rows.length - 1;
                        const tableBottomMargin = isLastRow ? 2.65 : 0.0;

                        if (
                            accumulatedHeight + rowHeight + tableBottomMargin >
                            remainingForRows
                        ) {
                            if (
                                rowsToFit.length === 0 &&
                                currentHeightList === 0.0
                            ) {
                                rowsToFit.push(row.html);
                                accumulatedHeight += rowHeight;
                                i++;
                            }

                            break;
                        }

                        rowsToFit.push(row.html);
                        accumulatedHeight += rowHeight;
                        i++;
                    }

                    if (rowsToFit.length > 0) {
                        const isLastRow = i >= rows.length;
                        const cost =
                            accumulatedHeight +
                            headerHeight +
                            tableTopMargin +
                            (isLastRow ? 2.65 : 0.0);

                        const classMatch = block.html?.match(
                            /class=["']([^"']+)["']/i,
                        );
                        const tableClass = classMatch
                            ? classMatch[1]
                            : 'section-content';

                        const styleMatch = block.html?.match(
                            /style=["']([^"']+)["']/i,
                        );
                        const tableStyle = styleMatch ? styleMatch[1] : '';

                        const styleAttr = tableStyle
                            ? ` style="${tableStyle}"`
                            : '';

                        let tableWrapperHtml = `<table class="${tableClass}"${styleAttr}>`;

                        if (headerHtml) {
                            tableWrapperHtml += `<thead>${headerHtml}</thead>`;
                        }

                        tableWrapperHtml += `<tbody>${rowsToFit.join(
                            '',
                        )}</tbody></table>`;

                        currentPageList.push({
                            id: `${block.id}-table-slice-${i}`,
                            type: 'html',
                            html: tableWrapperHtml,
                            height: cost,
                        });
                        currentHeightList += cost;
                    } else {
                        pagesList.push(currentPageList);
                        currentPageList = [];
                        currentHeightList = 0.0;
                    }
                }

                continue;
            }
        }

        if (currentPageList.length > 0) {
            pagesList.push(currentPageList);
        }

        return pagesList;
    }
}
