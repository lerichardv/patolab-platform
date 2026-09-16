<?php

namespace App\Services;

class DeliveryNotePaginator
{
    public const PAGE_CONTENT_HEIGHT = 208.0; // mm (Letter 279.4 - top margin 12 - header ~20.5 - gap 4 - footer 24 - gap ~5 - bottom margin 5)

    public const LINE_HEIGHT = 3.53; // mm (8pt * 1.25)

    public const LIST_ITEM_SPACING = 0.8; // mm

    public const MAX_CHARS_PER_LINE = 144;

    public const SIGNATURES_HEIGHT = 24.0; // mm

    /**
     * Paginate the delivery note HTML content into pages with word-like page breaking rules.
     *
     * @return array<int, array<int, array<string, mixed>>> Array of pages with their measured blocks
     */
    public static function paginate(?string $contentHtml): array
    {
        $pageContentHeight = self::PAGE_CONTENT_HEIGHT;
        $lineHeight = self::LINE_HEIGHT;
        $maxCharsPerLine = self::MAX_CHARS_PER_LINE;

        $rawBlocks = self::parseHtmlToBlocks($contentHtml ?? '');
        $classifiedBlocks = [];

        foreach ($rawBlocks as $bHtml) {
            $classified = self::classifyBlock($bHtml, $maxCharsPerLine);
            if (! empty($classified)) {
                $classifiedBlocks[] = $classified;
            }
        }

        $pages = self::paginateBlocks($classifiedBlocks, $pageContentHeight, $lineHeight, $maxCharsPerLine);

        if (empty($pages)) {
            $pages = [[]];
        }

        // Add signatures block on the last page
        $lastPageIndex = count($pages) - 1;
        $lastPageHeight = 0.0;
        foreach ($pages[$lastPageIndex] as $block) {
            $lastPageHeight += (float) ($block['height'] ?? 0.0);
        }

        $signaturesBlock = [
            'type' => 'signatures',
            'html' => '',
            'height' => self::SIGNATURES_HEIGHT,
        ];

        if ($lastPageHeight + self::SIGNATURES_HEIGHT <= $pageContentHeight) {
            $pages[$lastPageIndex][] = $signaturesBlock;
        } else {
            // Not enough space on current page, push to a fresh new page
            $pages[] = [$signaturesBlock];
        }

        return $pages;
    }

    /**
     * Parses raw HTML into top-level blocks.
     */
    public static function parseHtmlToBlocks(string $html): array
    {
        if (empty(trim($html))) {
            return [];
        }

        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?><div>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $root = $dom->getElementsByTagName('div')->item(0);
        $blocks = [];

        if ($root) {
            foreach ($root->childNodes as $child) {
                if ($child->nodeType === XML_ELEMENT_NODE) {
                    $blocks[] = $dom->saveHTML($child);
                } else {
                    $text = trim($child->textContent);
                    if ($text !== '') {
                        $blocks[] = '<p>'.htmlspecialchars($text).'</p>';
                    }
                }
            }
        }

        return $blocks;
    }

    /**
     * Classifies a block by HTML tag and estimates its height.
     */
    public static function classifyBlock(string $blockHtml, int $maxCharsPerLine): array
    {
        if (empty(trim($blockHtml))) {
            return [];
        }

        preg_match('/^<([a-zA-Z0-9]+)/i', $blockHtml, $matches);
        $tag = isset($matches[1]) ? strtolower($matches[1]) : 'p';

        if (str_contains($blockHtml, 'data-type="image-grid"')) {
            $columns = 2;
            if (preg_match('/data-columns=["\'](\d+)["\']/i', $blockHtml, $colMatch)) {
                $columns = (int) $colMatch[1];
            }
            if ($columns < 1) {
                $columns = 2;
            }

            $align = 'center';
            if (preg_match('/data-align=["\']([^"\']+)["\']/i', $blockHtml, $alignMatch)) {
                $align = $alignMatch[1];
            }

            $width = null;
            if (preg_match('/(?:width|data-width)=["\'](\d+)["\']/i', $blockHtml, $widthMatch)) {
                $width = (int) $widthMatch[1];
            }

            preg_match_all('/<img[^>]+>/i', $blockHtml, $imgMatches);
            $imgTags = array_slice($imgMatches[0] ?? [], 0, 4);
            $columns = max(1, count($imgTags));

            $usableWidth = $width ? (185.9 * ($width / 704.0)) : 185.9;
            $gap = 1.50; // mm
            $gridHeight = 2.0;

            $aspectSum = 0.0;
            foreach ($imgTags as $imgTag) {
                $aspectRatio = self::getImageAspectRatio($imgTag);
                $aspectSum += $aspectRatio > 0.0 ? (1.0 / $aspectRatio) : 1.0;
            }
            if ($aspectSum <= 0.0) {
                $aspectSum = 1.0;
            }

            $N = count($imgTags);
            if ($N > 0) {
                $calculatedHeight = ($usableWidth - ($N - 1) * $gap) / $aspectSum;
                $maxRowHeight = $N === 1 ? min(120.0, $usableWidth) : ($usableWidth * 1.5);
                $gridHeight += min($calculatedHeight, $maxRowHeight);
            }

            return [
                'type' => 'image-grid',
                'html' => $blockHtml,
                'columns' => $columns,
                'alignment' => $align,
                'width' => $width,
                'images' => $imgTags,
                'height' => $gridHeight,
            ];
        }

        if (str_contains($blockHtml, 'page-break') || str_contains($blockHtml, 'break-after')) {
            return [
                'type' => 'page-break',
                'html' => $blockHtml,
                'height' => 0.0,
            ];
        }

        if (in_array($tag, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])) {
            $height = 7.94;
            if ($tag === 'h1') {
                $height = 11.91;
            } elseif ($tag === 'h2') {
                $height = 9.925;
            }

            return [
                'type' => 'heading',
                'tag' => $tag,
                'html' => $blockHtml,
                'height' => $height,
            ];
        }

        if ($tag === 'ul' || $tag === 'ol') {
            return [
                'type' => 'list',
                'tag' => $tag,
                'html' => $blockHtml,
                'height' => 0.0, // Calculated dynamically during pagination
            ];
        }

        if ($tag === 'table' || str_contains($blockHtml, '<table')) {
            return [
                'type' => 'table',
                'html' => $blockHtml,
                'height' => 0.0, // Calculated dynamically during pagination
            ];
        }

        if ($tag === 'img' || (str_contains($blockHtml, '<img') && ! str_contains($blockHtml, '<p'))) {
            $height = self::getImageHeight($blockHtml);

            return [
                'type' => 'image',
                'html' => $blockHtml,
                'height' => $height,
            ];
        }

        if ($tag === 'blockquote') {
            $lines = self::splitHtmlIntoLines($blockHtml, $maxCharsPerLine);
            $count = max(1, count($lines));
            $height = ($count * self::LINE_HEIGHT) + 2.0;

            return [
                'type' => 'blockquote',
                'html' => $blockHtml,
                'height' => $height,
            ];
        }

        // Default: paragraph
        $fontLineHeight = self::getBlockLineHeight($blockHtml);
        $lines = self::splitHtmlIntoLines($blockHtml, $maxCharsPerLine);
        $count = max(1, count($lines));
        $height = ($count * $fontLineHeight) + 1.5;

        return [
            'type' => 'paragraph',
            'html' => $blockHtml,
            'height' => $height,
        ];
    }

    /**
     * Distributes classified blocks into pages with line-by-line, list-item, and table-row splitting.
     */
    public static function paginateBlocks(
        array $blocksList,
        float $pageContentHeight,
        float $lineHeight,
        int $maxCharsPerLine
    ): array {
        $pagesList = [];
        $currentPage = [];
        $currentHeight = 0.0;

        foreach ($blocksList as $block) {
            if (empty($block)) {
                continue;
            }

            if ($block['type'] === 'page-break') {
                if (! empty($currentPage)) {
                    $pagesList[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                }

                continue;
            }

            // Handle List splitting
            if ($block['type'] === 'list') {
                $listData = self::parseListItems($block['html'], $maxCharsPerLine, $lineHeight, self::LIST_ITEM_SPACING);
                $tag = $listData['tag'];
                $items = $listData['items'];
                $listStyleType = $listData['listStyleType'];
                $styleAttr = $listData['styleAttr'];

                $olStartIndex = 1;
                if ($tag === 'ol' && preg_match('/start=["\'](\d+)["\']/i', $block['html'], $startMatch)) {
                    $olStartIndex = (int) $startMatch[1];
                }

                $tagClose = "</{$tag}>";

                $pendingItems = $items;
                while (! empty($pendingItems)) {
                    $available = $pageContentHeight - $currentHeight;
                    $fitCount = 0;
                    $accumHeight = 0.0;

                    foreach ($pendingItems as $item) {
                        if ($accumHeight + $item['height'] <= $available) {
                            $accumHeight += $item['height'];
                            $fitCount++;
                        } else {
                            break;
                        }
                    }

                    if ($fitCount === 0 && empty($currentPage)) {
                        $fitCount = 1;
                        $accumHeight = $pendingItems[0]['height'];
                    }

                    if ($fitCount > 0) {
                        $slice = array_slice($pendingItems, 0, $fitCount);

                        $tagOpen = "<{$tag}";
                        if ($tag === 'ol' && $olStartIndex > 1) {
                            $tagOpen .= " start=\"{$olStartIndex}\"";
                        }
                        if ($listStyleType) {
                            $tagOpen .= " data-list-style-type=\"{$listStyleType}\"";
                        }
                        if ($styleAttr) {
                            $tagOpen .= " style=\"{$styleAttr}\"";
                        }
                        $tagOpen .= '>';

                        $sliceHtml = $tagOpen.implode('', array_column($slice, 'html')).$tagClose;

                        $currentPage[] = [
                            'type' => 'list',
                            'tag' => $tag,
                            'html' => $sliceHtml,
                            'height' => $accumHeight,
                        ];
                        $currentHeight += $accumHeight;
                        $pendingItems = array_slice($pendingItems, $fitCount);
                        $olStartIndex += $fitCount;
                    }

                    if (! empty($pendingItems)) {
                        $pagesList[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                    }
                }

                continue;
            }

            // Handle Table splitting
            if ($block['type'] === 'table') {
                $tableData = self::paginateTable($block['html'], $maxCharsPerLine, $lineHeight);
                $headerHtml = $tableData['headerHtml'];
                $headerHeight = $tableData['headerHeight'];
                $rows = $tableData['rows'];

                $pendingRows = $rows;
                while (! empty($pendingRows)) {
                    $available = $pageContentHeight - $currentHeight;
                    $neededHeaderHeight = (! empty($headerHtml) && empty($currentPage)) ? $headerHeight : $headerHeight;

                    $fitCount = 0;
                    $accumHeight = $neededHeaderHeight;

                    foreach ($pendingRows as $row) {
                        if ($accumHeight + $row['height'] <= $available) {
                            $accumHeight += $row['height'];
                            $fitCount++;
                        } else {
                            break;
                        }
                    }

                    if ($fitCount > 0) {
                        $slice = array_slice($pendingRows, 0, $fitCount);
                        $tableRowsHtml = implode('', array_column($slice, 'html'));
                        $sliceTableHtml = "<table class=\"tiptap-table\">{$headerHtml}<tbody>{$tableRowsHtml}</tbody></table>";

                        $currentPage[] = [
                            'type' => 'table',
                            'html' => $sliceTableHtml,
                            'height' => $accumHeight,
                        ];
                        $currentHeight += $accumHeight;
                        $pendingRows = array_slice($pendingRows, $fitCount);
                    }

                    if (! empty($pendingRows)) {
                        $pagesList[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                    }
                }

                continue;
            }

            // Handle Paragraph line splitting
            if ($block['type'] === 'paragraph') {
                $cost = (float) $block['height'];
                if ($currentHeight + $cost <= $pageContentHeight) {
                    $currentPage[] = $block;
                    $currentHeight += $cost;

                    continue;
                }

                $fontLineHeight = self::getBlockLineHeight($block['html']);
                $lines = self::splitHtmlIntoLines($block['html'], $maxCharsPerLine);

                $pendingLines = $lines;
                while (! empty($pendingLines)) {
                    $available = $pageContentHeight - $currentHeight;
                    $fitCount = (int) floor($available / $fontLineHeight);

                    if ($fitCount > 0 && ! empty($pendingLines)) {
                        $sliceCount = min($fitCount, count($pendingLines));
                        $slice = array_slice($pendingLines, 0, $sliceCount);
                        $sliceHtml = '<p>'.implode(' ', $slice).'</p>';
                        $sliceHeight = ($sliceCount * $fontLineHeight) + 1.0;

                        $currentPage[] = [
                            'type' => 'paragraph',
                            'html' => $sliceHtml,
                            'height' => $sliceHeight,
                        ];
                        $currentHeight += $sliceHeight;
                        $pendingLines = array_slice($pendingLines, $sliceCount);
                    }

                    if (! empty($pendingLines)) {
                        $pagesList[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                    }
                }

                continue;
            }

            // Image Grid
            if ($block['type'] === 'image-grid') {
                $columns = $block['columns'] ?? 2;
                $images = $block['images'] ?? [];

                if (empty($images)) {
                    $fallbackBlock = [
                        'type' => 'image-grid',
                        'html' => $block['html'] ?? '',
                        'height' => 5.3,
                    ];
                    if ($currentHeight + 5.3 > $pageContentHeight && ! empty($currentPage)) {
                        $pagesList[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                    }
                    $currentPage[] = $fallbackBlock;
                    $currentHeight += 5.3;

                    continue;
                }

                $width = $block['width'] ?? null;
                $usableWidth = $width ? (185.9 * ($width / 704.0)) : 185.9;
                $gap = 1.50; // mm
                $slicedImages = array_slice($images, 0, 4);
                $rowsRemaining = [$slicedImages];

                // Pre-calculate height of each row using justified aspect ratios
                $rowHeights = [];
                $rowCaptionHeights = [];
                foreach ($rowsRemaining as $rowIndex => $rowImages) {
                    $aspectSum = 0.0;
                    foreach ($rowImages as $imgTag) {
                        $aspectRatio = self::getImageAspectRatio($imgTag);
                        if ($aspectRatio > 0.0) {
                            $aspectSum += 1.0 / $aspectRatio;
                        } else {
                            $aspectSum += 1.0;
                        }
                    }
                    if ($aspectSum <= 0.0) {
                        $aspectSum = 1.0;
                    }
                    $N = count($rowImages);
                    $maxRowHeight = $N === 1 ? min(120.0, $usableWidth) : ($usableWidth * 1.5);
                    $calculatedHeight = ($usableWidth - ($N - 1) * $gap) / $aspectSum;
                    $rowHeights[$rowIndex] = min($calculatedHeight, $maxRowHeight);

                    // Max caption height in this row
                    $maxCaptionHeight = 0.0;
                    $colWidthMm = ($usableWidth - ($N - 1) * $gap) / $N;
                    $maxCharsForCaption = max(12, (int) floor($colWidthMm / 1.5));

                    foreach ($rowImages as $imgTag) {
                        preg_match('/data-caption=["\']([^"\']*)["\']/i', $imgTag, $captionMatch);
                        if (! $captionMatch) {
                            preg_match('/alt=["\']([^"\']*)["\']/i', $imgTag, $captionMatch);
                        }
                        $caption = $captionMatch ? htmlspecialchars($captionMatch[1]) : '';
                        if ($caption) {
                            $captionLines = max(1, (int) ceil(mb_strlen($caption) / $maxCharsForCaption));
                            $captionHeight = $captionLines * 3.60 + 1.06;
                            if ($captionHeight > $maxCaptionHeight) {
                                $maxCaptionHeight = $captionHeight;
                            }
                        }
                    }
                    $rowCaptionHeights[$rowIndex] = $maxCaptionHeight;
                }

                while (! empty($rowsRemaining)) {
                    $remaining = $pageContentHeight - $currentHeight;
                    $totalRows = count($rowHeights);
                    $currentIndex = $totalRows - count($rowsRemaining);

                    $minGridHeight = $rowHeights[$currentIndex] + $rowCaptionHeights[$currentIndex] + 2.0;

                    if ($remaining < $minGridHeight && ! empty($currentPage)) {
                        $pagesList[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;

                        continue;
                    }

                    $r = 0;
                    for ($tempR = 1; $tempR <= count($rowsRemaining); $tempR++) {
                        $cost = 2.0;
                        for ($i = 0; $i < $tempR; $i++) {
                            $cost += $rowHeights[$currentIndex + $i] + $rowCaptionHeights[$currentIndex + $i];
                            if ($i > 0) {
                                $cost += 1.5;
                            }
                        }
                        if ($cost <= $remaining) {
                            $r = $tempR;
                        } else {
                            break;
                        }
                    }

                    if ($r === 0) {
                        if (! empty($currentPage)) {
                            $pagesList[] = $currentPage;
                            $currentPage = [];
                            $currentHeight = 0.0;

                            continue;
                        } else {
                            $r = 1;
                        }
                    }

                    $sliceImages = [];
                    for ($i = 0; $i < $r; $i++) {
                        $rowIdx = $currentIndex + $i;
                        $rowImages = $rowsRemaining[$i];
                        $H_j = $rowHeights[$rowIdx];

                        foreach ($rowImages as $imgTag) {
                            $aspect = self::getImageAspectRatio($imgTag);
                            $widthMm = $aspect > 0.0 ? ($H_j / $aspect) : $H_j;
                            $styleRule = "height: {$H_j}mm; width: 100%; object-fit: cover; border-radius: 1.06mm;";

                            if (preg_match('/style=["\']([^"\']*)["\']/i', $imgTag, $styleMatch)) {
                                $imgTag = preg_replace('/style=["\']([^"\']*)["\']/i', 'style="'.$styleRule.'"', $imgTag);
                            } else {
                                $imgTag = str_replace('<img', '<img style="'.$styleRule.'"', $imgTag);
                            }

                            $caption = '';
                            if (preg_match('/data-caption=["\']([^"\']*)["\']/i', $imgTag, $captionMatch)) {
                                $caption = $captionMatch[1];
                            } elseif (preg_match('/alt=["\']([^"\']*)["\']/i', $imgTag, $captionMatch)) {
                                $caption = $captionMatch[1];
                            }

                            $captionHtml = '';
                            if ($caption !== '') {
                                $captionHtml = '<div class="gallery-image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2; width: 100%; word-break: break-word;">'.htmlspecialchars($caption).'</div>';
                            }

                            $wrappedImg = '<div class="grid-image-container" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: '.$widthMm.'mm; max-width: 100%;">'.
                                $imgTag.
                                $captionHtml.
                                '</div>';

                            $sliceImages[] = $wrappedImg;
                        }
                    }
                    $align = $block['alignment'] ?? 'center';
                    $width = $block['width'] ?? null;
                    $isLeft = $align === 'left';
                    $isRight = $align === 'right';
                    $marginLeft = $isLeft ? '0' : 'auto';
                    $marginRight = $isRight ? '0' : 'auto';
                    $styles = [
                        'display: flex',
                        'flex-wrap: nowrap',
                        "gap: {$gap}mm",
                        "margin-left: {$marginLeft}",
                        "margin-right: {$marginRight}",
                    ];
                    if ($width) {
                        $styles[] = "width: {$width}px";
                    }
                    $styleStr = implode('; ', $styles).';';
                    $widthAttr = $width ? " width=\"{$width}\"" : '';

                    $sliceHtml = "<div data-type=\"image-grid\" class=\"align-{$align}\" data-columns=\"{$columns}\" data-align=\"{$align}\"{$widthAttr} style=\"{$styleStr}\">".implode('', $sliceImages).'</div>';
                    $cost = 2.0;
                    for ($i = 0; $i < $r; $i++) {
                        $cost += $rowHeights[$currentIndex + $i] + $rowCaptionHeights[$currentIndex + $i];
                        if ($i > 0) {
                            $cost += 1.5;
                        }
                    }

                    $currentPage[] = [
                        'type' => 'image-grid',
                        'html' => $sliceHtml,
                        'height' => $cost,
                    ];
                    $currentHeight += $cost;
                    $rowsRemaining = array_slice($rowsRemaining, $r);
                }

                continue;
            }

            // Headings / Images / Blockquotes
            $cost = (float) $block['height'];
            if ($currentHeight + $cost > $pageContentHeight && ! empty($currentPage)) {
                $pagesList[] = $currentPage;
                $currentPage = [];
                $currentHeight = 0.0;
            }

            $currentPage[] = $block;
            $currentHeight += $cost;
        }

        if (! empty($currentPage)) {
            $pagesList[] = $currentPage;
        }

        return $pagesList;
    }

    /**
     * Splits an HTML string into lines respecting max characters.
     */
    public static function splitHtmlIntoLines(string $html, int $maxCharsPerLine = 155): array
    {
        if (empty(trim($html))) {
            return [];
        }

        $tokenRegex = '/(<\/?[a-zA-Z0-9]+(?:\s+[^>]*)?>|[^<]+)/ui';
        preg_match_all($tokenRegex, $html, $matches);
        $tokens = $matches[0] ?? [];

        $lines = [];
        $currentLineHtml = '';
        $currentLineLength = 0;
        $activeTagsStack = [];

        $closeActiveTags = function () use (&$activeTagsStack) {
            $closing = '';
            for ($i = count($activeTagsStack) - 1; $i >= 0; $i--) {
                preg_match('/<([a-zA-Z0-9]+)/i', $activeTagsStack[$i], $tagMatch);
                if (isset($tagMatch[1])) {
                    $closing .= '</'.$tagMatch[1].'>';
                }
            }

            return $closing;
        };

        $openActiveTags = function () use (&$activeTagsStack) {
            return implode('', $activeTagsStack);
        };

        foreach ($tokens as $token) {
            if (str_starts_with($token, '<')) {
                if (str_starts_with($token, '</')) {
                    array_pop($activeTagsStack);
                    $currentLineHtml .= $token;
                } elseif (str_ends_with($token, '/>') || preg_match('/^<br\b/i', $token)) {
                    if (preg_match('/^<br\b/i', $token)) {
                        $currentLineHtml .= $token;
                        $currentLineHtml .= $closeActiveTags();
                        $lines[] = $currentLineHtml;
                        $currentLineHtml = $openActiveTags();
                        $currentLineLength = 0;
                    } else {
                        $currentLineHtml .= $token;
                    }
                } else {
                    $activeTagsStack[] = $token;
                    $currentLineHtml .= $token;
                }
            } else {
                preg_match_all('/(\s+|\S+)/u', $token, $wordMatches);
                $words = $wordMatches[0] ?? [];

                foreach ($words as $word) {
                    $wordLen = mb_strlen($word);
                    if ($currentLineLength + $wordLen > $maxCharsPerLine && $currentLineLength > 0) {
                        $currentLineHtml .= $closeActiveTags();
                        $lines[] = $currentLineHtml;

                        $currentLineHtml = $openActiveTags();
                        $currentLineLength = 0;
                    }

                    $currentLineHtml .= $word;
                    $currentLineLength += $wordLen;
                }
            }
        }

        if ($currentLineLength > 0 || trim($currentLineHtml) !== '') {
            $currentLineHtml .= $closeActiveTags();
            $lines[] = $currentLineHtml;
        }

        return $lines;
    }

    /**
     * Resolves effective line height in mm from HTML style attributes.
     */
    public static function getBlockLineHeight(string $blockHtml): float
    {
        $fontSize = self::LINE_HEIGHT;
        if (preg_match('/font-size:\s*([\d.]+)pt/i', $blockHtml, $matches)) {
            $fontSize = ((float) $matches[1] * 25.4) / 72.0;
        }

        $multiplier = 1.25;
        if (preg_match('/line-height:\s*([\d.]+)/i', $blockHtml, $matches)) {
            $multiplier = (float) $matches[1];
        }

        return $fontSize * $multiplier;
    }

    /**
     * Calculates height of an image block in mm.
     */
    public static function getImageHeight(string $blockHtml): float
    {
        preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $blockHtml, $srcMatch);

        $attrWidth = null;
        if (preg_match('/<img[^>]+width=["\'](\d+)["\']/i', $blockHtml, $wMatch)) {
            $attrWidth = (int) $wMatch[1];
        } elseif (preg_match('/width:\s*(\d+)px/i', $blockHtml, $swMatch)) {
            $attrWidth = (int) $swMatch[1];
        }

        $attrHeight = null;
        if (preg_match('/<img[^>]+height=["\'](\d+)["\']/i', $blockHtml, $hMatch)) {
            $attrHeight = (int) $hMatch[1];
        } elseif (preg_match('/height:\s*(\d+)px/i', $blockHtml, $shMatch)) {
            $attrHeight = (int) $shMatch[1];
        }

        $rawWidth = null;
        $rawHeight = null;

        if (isset($srcMatch[1])) {
            $src = $srcMatch[1];
            $localPath = null;

            if (str_starts_with($src, 'data:')) {
                if (preg_match('/^data:[^;]+;base64,(.+)$/', $src, $base64Matches)) {
                    $imgData = @base64_decode($base64Matches[1]);
                    if ($imgData !== false) {
                        $info = @getimagesizefromstring($imgData);
                        if ($info) {
                            $rawWidth = $info[0];
                            $rawHeight = $info[1];
                        }
                    }
                }
            } else {
                $urlPath = parse_url($src, PHP_URL_PATH);
                if ($urlPath) {
                    if (preg_match('/^\/storage\/(.+)$/', $urlPath, $storageMatches)) {
                        $localPath = storage_path('app/public/'.$storageMatches[1]);
                    } else {
                        $localPath = public_path(ltrim($urlPath, '/'));
                    }
                }

                if ($localPath && file_exists($localPath)) {
                    $info = @getimagesize($localPath);
                    if ($info) {
                        $rawWidth = $info[0];
                        $rawHeight = $info[1];
                    }
                }
            }
        }

        $width = $attrWidth ?? $rawWidth ?? 704;
        $height = $attrHeight;

        if (! $height) {
            $aspect = ($rawWidth && $rawHeight && $rawWidth > 0) ? ($rawHeight / $rawWidth) : 1.0;
            $height = (int) round($width * $aspect);
        }

        if ($width > 704) {
            $height = (int) round($height * (704 / $width));
        }

        $heightMm = ($height * 25.4) / 96;

        return $heightMm + 1.0;
    }

    /**
     * Resolves the aspect ratio (height / width) of an image tag.
     */
    public static function getImageAspectRatio(string $imgTag): float
    {
        $attrWidth = null;
        if (preg_match('/width=["\'](\d+)["\']/i', $imgTag, $wMatch)) {
            $attrWidth = (int) $wMatch[1];
        } elseif (preg_match('/width:\s*(\d+)px/i', $imgTag, $swMatch)) {
            $attrWidth = (int) $swMatch[1];
        }

        $attrHeight = null;
        if (preg_match('/height=["\'](\d+)["\']/i', $imgTag, $hMatch)) {
            $attrHeight = (int) $hMatch[1];
        } elseif (preg_match('/height:\s*(\d+)px/i', $imgTag, $shMatch)) {
            $attrHeight = (int) $shMatch[1];
        }

        if ($attrWidth && $attrHeight && $attrWidth > 0) {
            return $attrHeight / $attrWidth;
        }

        preg_match('/src=["\']([^"\']+)["\']/i', $imgTag, $srcMatch);
        if (isset($srcMatch[1])) {
            $src = $srcMatch[1];

            if (str_starts_with($src, 'data:')) {
                if (preg_match('/^data:[^;]+;base64,(.+)$/', $src, $base64Matches)) {
                    $imgData = @base64_decode($base64Matches[1]);
                    if ($imgData !== false) {
                        $info = @getimagesizefromstring($imgData);
                        if ($info && $info[0] > 0) {
                            return $info[1] / $info[0];
                        }
                    }
                }
            } else {
                $urlPath = parse_url($src, PHP_URL_PATH);
                $localPath = null;
                if ($urlPath) {
                    if (preg_match('/^\/storage\/(.+)$/', $urlPath, $storageMatches)) {
                        $localPath = storage_path('app/public/'.$storageMatches[1]);
                    } else {
                        $localPath = public_path(ltrim($urlPath, '/'));
                    }
                }

                if ($localPath && file_exists($localPath)) {
                    $info = @getimagesize($localPath);
                    if ($info && $info[0] > 0) {
                        return $info[1] / $info[0];
                    }
                }
            }
        }

        return 1.0;
    }

    /**
     * Parses list items and estimates each item's height.
     */
    public static function parseListItems(string $listHtml, int $maxCharsPerLine, float $fontLineHeight, float $itemSpacing): array
    {
        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?>'.$listHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $listElement = $dom->getElementsByTagName('ul')->item(0);
        $tag = 'ul';
        if (! $listElement) {
            $listElement = $dom->getElementsByTagName('ol')->item(0);
            $tag = 'ol';
        }

        if (! $listElement) {
            return ['tag' => 'ul', 'items' => [], 'listStyleType' => null, 'styleAttr' => null];
        }

        $tag = strtolower($listElement->nodeName);
        $listStyleType = $listElement->hasAttribute('data-list-style-type') ? $listElement->getAttribute('data-list-style-type') : null;
        $styleAttr = $listElement->hasAttribute('style') ? $listElement->getAttribute('style') : null;

        $items = [];
        $liNodes = [];
        foreach ($listElement->childNodes as $child) {
            if ($child->nodeType === XML_ELEMENT_NODE && strtolower($child->nodeName) === 'li') {
                $liNodes[] = $child;
            }
        }
        if (empty($liNodes)) {
            foreach ($listElement->getElementsByTagName('li') as $li) {
                $liNodes[] = $li;
            }
        }

        $totalLi = count($liNodes);
        $listCharsPerLine = max(10, $maxCharsPerLine - 15);

        foreach ($liNodes as $idx => $li) {
            $isLast = ($idx === $totalLi - 1);
            $liFull = $dom->saveHTML($li);

            $liInner = '';
            foreach ($li->childNodes as $c) {
                $liInner .= $dom->saveHTML($c);
            }

            $rawSegments = preg_split('/<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>/i', $liInner);
            $segments = [];
            if ($rawSegments) {
                foreach ($rawSegments as $s) {
                    $cleaned = html_entity_decode(trim(strip_tags($s)), ENT_QUOTES, 'UTF-8');
                    if (mb_strlen($cleaned) > 0) {
                        $segments[] = $cleaned;
                    }
                }
            }

            $itemLines = empty($segments) ? 1 : 0;
            foreach ($segments as $seg) {
                $itemLines += max(1, (int) ceil(mb_strlen($seg) / $listCharsPerLine));
            }

            $itemHeight = ($itemLines * $fontLineHeight) + ($isLast ? 0.0 : $itemSpacing);
            $items[] = [
                'html' => $liFull,
                'height' => $itemHeight,
            ];
        }

        return [
            'tag' => $tag,
            'items' => $items,
            'listStyleType' => $listStyleType,
            'styleAttr' => $styleAttr,
        ];
    }

    /**
     * Parses and paginates a table into header and rows with calculated heights.
     */
    public static function paginateTable(string $tableHtml, int $maxCharsPerLine = 155, float $fontLineHeight = 3.53): array
    {
        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?>'.$tableHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $table = $dom->getElementsByTagName('table')->item(0);

        if (! $table) {
            return ['headerHtml' => '', 'headerHeight' => 0.0, 'rows' => [], 'colCount' => 1];
        }

        $headerHtml = '';
        $headerHeight = 0.0;
        $rows = [];
        $colCount = 1;

        $trElements = $table->getElementsByTagName('tr');
        $trList = [];
        foreach ($trElements as $tr) {
            $trList[] = $tr;
            $thCount = $tr->getElementsByTagName('th')->length;
            $tdCount = $tr->getElementsByTagName('td')->length;
            $colCount = max($colCount, $thCount, $tdCount);
        }

        $cellPaddingVertical = 2.64;

        foreach ($trList as $tr) {
            $isHeader = ($tr->parentNode->nodeName === 'thead' || $tr->getElementsByTagName('th')->length > 0);
            $trHtml = $dom->saveHTML($tr);

            $cells = $isHeader ? $tr->getElementsByTagName('th') : $tr->getElementsByTagName('td');
            if ($cells->length === 0) {
                $cells = $tr->getElementsByTagName('th');
            }
            if ($cells->length === 0) {
                $cells = $tr->getElementsByTagName('td');
            }

            $maxCellHeight = $fontLineHeight + $cellPaddingVertical;
            $cellChars = max(8, (int) floor($maxCharsPerLine / max(1, $colCount)));

            foreach ($cells as $cell) {
                $cellInner = '';
                foreach ($cell->childNodes as $child) {
                    $cellInner .= $dom->saveHTML($child);
                }

                $rawSegments = preg_split('/<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>|<li[^>]*>|<\/li>/i', $cellInner);
                $cellLines = 0;
                if ($rawSegments) {
                    foreach ($rawSegments as $s) {
                        $cleaned = html_entity_decode(trim(strip_tags($s)), ENT_QUOTES, 'UTF-8');
                        if (mb_strlen($cleaned) > 0) {
                            $cellLines += max(1, (int) ceil(mb_strlen($cleaned) / $cellChars));
                        }
                    }
                }
                if ($cellLines === 0) {
                    $cellLines = 1;
                }

                $cellHeight = ($cellLines * $fontLineHeight) + $cellPaddingVertical;
                $maxCellHeight = max($maxCellHeight, $cellHeight);
            }

            if ($isHeader) {
                $headerHtml .= $trHtml;
                $headerHeight += $maxCellHeight;
            } else {
                $rows[] = [
                    'html' => $trHtml,
                    'height' => $maxCellHeight,
                ];
            }
        }

        return [
            'headerHtml' => $headerHtml,
            'headerHeight' => $headerHeight,
            'rows' => $rows,
            'colCount' => $colCount,
        ];
    }
}
