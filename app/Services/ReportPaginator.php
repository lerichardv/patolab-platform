<?php

namespace App\Services;

class ReportPaginator
{
    public static function paginate($specimen, $report, $customer, $referrer, $isMicroscopyVisible): array
    {
        $pageContentHeight = 250.50; // mm
        $lineHeight = 3.97; // mm
        $maxCharsPerLine = 140;
        $signatureHeight = 19.84; // mm

        // 1. Calculate Patient Metadata Card height (mm)
        $patientCardHeight = self::estimatePatientCardHeight($specimen, $customer, $referrer);

        // 2. Build stream of content blocks
        $blocks = [];

        // Patient Card block (added first)
        $blocks[] = [
            'type' => 'patient-card',
            'height' => $patientCardHeight,
        ];

        // Diagnosis Section
        $diagHtml = ! empty($report->diagnosis_html) ? $report->diagnosis_html : ($specimen->diagnosis ?? '');
        if (! empty($diagHtml)) {
            $blocks[] = [
                'type' => 'section-header',
                'title' => 'DIAGNÓSTICO',
                'height' => 7.94,
            ];
            $diagBlocks = self::parseHtmlToBlocks($diagHtml);
            foreach ($diagBlocks as $bHtml) {
                $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
            }
        }

        // Macroscopy Section
        $macroHtml = ! empty($report->macroscopy_html) ? $report->macroscopy_html : '<i>Pendiente de revisión macroscópica.</i>';
        $blocks[] = [
            'type' => 'section-header',
            'title' => 'DESCRIPCIÓN MACROSCÓPICA',
            'height' => 7.94,
        ];
        $macroBlocks = self::parseHtmlToBlocks($macroHtml);
        foreach ($macroBlocks as $bHtml) {
            $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
        }

        // Microscopy Section (if visible)
        if ($isMicroscopyVisible) {
            $microHtml = ! empty($report->microscopy_html) ? $report->microscopy_html : '<i>Pendiente de revisión microscópica.</i>';
            $blocks[] = [
                'type' => 'section-header',
                'title' => 'DESCRIPCIÓN MICROSCÓPICA',
                'height' => 7.94,
            ];
            $microBlocks = self::parseHtmlToBlocks($microHtml);
            foreach ($microBlocks as $bHtml) {
                $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
            }
        }

        // 3. Paginate the stream of blocks
        $pages = [];
        $currentPage = [];
        $currentHeight = 0.0;
        $pageIndex = 0;

        for ($bIndex = 0; $bIndex < count($blocks); $bIndex++) {
            $block = $blocks[$bIndex];
            $maxHeightForPage = $pageContentHeight;

            if ($block['type'] === 'patient-card') {
                $currentPage[] = $block;
                $currentHeight += $block['height'];

                continue;
            }

            if ($block['type'] === 'section-header') {
                // If section header doesn't fit on this page, push to next
                if ($currentHeight + $block['height'] > $maxHeightForPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                    $maxHeightForPage = $pageContentHeight;
                }
                $currentPage[] = $block;
                $currentHeight += $block['height'];

                continue;
            }

            if ($block['type'] === 'page-break') {
                if (count($currentPage) > 0) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                }

                continue;
            }

            if ($block['type'] === 'heading') {
                $headingCost = $block['height'];
                $nextBlockStartsNewPage = false;

                // Keep with Next constraint
                if ($bIndex + 1 < count($blocks)) {
                    $nextBlock = $blocks[$bIndex + 1];
                    $minNextHeight = 2.0 * $lineHeight;

                    if ($nextBlock['type'] === 'image') {
                        $minNextHeight = (float) $nextBlock['height'];
                    } elseif ($nextBlock['type'] === 'heading') {
                        $minNextHeight = (float) $nextBlock['height'];
                    }

                    if ($currentHeight + $headingCost + $minNextHeight > $maxHeightForPage) {
                        $nextBlockStartsNewPage = true;
                    }
                }

                if ($currentHeight + $headingCost > $maxHeightForPage || $nextBlockStartsNewPage) {
                    if (count($currentPage) > 0) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;
                        $maxHeightForPage = $pageContentHeight;
                    }
                }

                $currentPage[] = $block;
                $currentHeight += $headingCost;

                continue;
            }

            if ($block['type'] === 'image') {
                if ($currentHeight + $block['height'] > $maxHeightForPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                    $maxHeightForPage = $pageContentHeight;
                }
                $currentPage[] = $block;
                $currentHeight += $block['height'];

                continue;
            }

            if ($block['type'] === 'paragraph') {
                $paraInnerHtml = self::getInnerHtml($block['html'], $block['tag']);
                $lines = self::splitHtmlIntoLines($paraInnerHtml, $maxCharsPerLine);

                $i = 0;
                while ($i < count($lines)) {
                    $maxHeightForPage = $pageContentHeight;
                    $remaining = $maxHeightForPage - $currentHeight;

                    if ($remaining <= 0.5 * $lineHeight) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    $linesToFit = min((int) floor($remaining / $lineHeight), count($lines) - $i);
                    if ($linesToFit <= 0) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    $slice = array_slice($lines, $i, $linesToFit);

                    // Is this the last slice of the paragraph?
                    $isLastSlice = ($i + $linesToFit >= count($lines));
                    $classAttr = ! empty($block['class']) ? $block['class'] : 'section-content';
                    $style = $isLastSlice ? '' : 'style="margin-bottom: 0px;"';

                    $sliceHtml = "<{$block['tag']} class=\"{$classAttr}\" {$style}>".implode('', $slice)."</{$block['tag']}>";
                    $blockCost = ($linesToFit * $lineHeight) + ($isLastSlice ? 0.5 * $lineHeight : 0.0);

                    $currentPage[] = [
                        'type' => 'html',
                        'html' => $sliceHtml,
                        'height' => $blockCost,
                    ];

                    $currentHeight += $blockCost;
                    $i += $linesToFit;
                }

                continue;
            }

            if ($block['type'] === 'list') {
                $listData = self::paginateList($block['html']);
                $listItems = $listData['items'];
                $tag = $listData['tag'];

                $i = 0;
                $olStartIndex = 1;
                while ($i < count($listItems)) {
                    $maxHeightForPage = $pageContentHeight;
                    $remaining = $maxHeightForPage - $currentHeight;

                    if ($remaining <= 1.0 * $lineHeight) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    // Estimate this item's lines
                    $itemHtml = $listItems[$i];
                    $itemPlainText = trim(strip_tags($itemHtml));
                    $itemTextLines = max(1, (int) ceil(mb_strlen($itemPlainText) / ($maxCharsPerLine - 5)));
                    $itemHeight = $itemTextLines * $lineHeight;

                    if ($itemHeight > $remaining) {
                        if ($currentHeight === 0.0) {
                            $startAttr = ($tag === 'ol' && $olStartIndex > 1) ? " start=\"{$olStartIndex}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}>".$itemHtml."</{$tag}>",
                                'height' => $itemHeight + 0.5 * $lineHeight,
                            ];
                            $currentHeight += $itemHeight + 0.5 * $lineHeight;
                            $i++;
                            $olStartIndex++;
                        } else {
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentHeight = 0.0;
                            $pageIndex++;
                        }
                    } else {
                        $itemsToFit = [];
                        $accumulatedHeight = 0.0;

                        while ($i < count($listItems)) {
                            $nextItemHtml = $listItems[$i];
                            $nextItemPlainText = trim(strip_tags($nextItemHtml));
                            $nextItemLines = max(1, (int) ceil(mb_strlen($nextItemPlainText) / ($maxCharsPerLine - 5)));
                            $nextItemHeight = $nextItemLines * $lineHeight;

                            $isLastOfAll = ($i === count($listItems) - 1);
                            $spacingOverhead = $isLastOfAll ? 0.5 * $lineHeight : 0.0;

                            if ($accumulatedHeight + $nextItemHeight + $spacingOverhead > $remaining) {
                                break;
                            }

                            $itemsToFit[] = $nextItemHtml;
                            $accumulatedHeight += $nextItemHeight;
                            $i++;
                        }

                        if (count($itemsToFit) > 0) {
                            $isLastOfAll = ($i >= count($listItems));
                            $cost = $accumulatedHeight + ($isLastOfAll ? 0.5 * $lineHeight : 0.0);

                            $startAttr = ($tag === 'ol' && $olStartIndex > 1) ? " start=\"{$olStartIndex}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}>".implode('', $itemsToFit)."</{$tag}>",
                                'height' => $cost,
                            ];
                            $currentHeight += $cost;
                            $olStartIndex += count($itemsToFit);
                        } else {
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentHeight = 0.0;
                            $pageIndex++;
                        }
                    }
                }

                continue;
            }

            if ($block['type'] === 'table') {
                $tableData = self::paginateTable($block['html'], $maxCharsPerLine);
                $headerHtml = $tableData['headerHtml'];
                $rows = $tableData['rows'];
                $colCount = $tableData['colCount'];

                $i = 0;
                while ($i < count($rows)) {
                    $maxHeightForPage = $pageContentHeight;
                    $remaining = $maxHeightForPage - $currentHeight;

                    if ($remaining <= 5 * $lineHeight) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    $headerHeight = empty($headerHtml) ? 0.0 : 2.0 * $lineHeight;
                    $remainingForRows = $remaining - $headerHeight;

                    $rowsToFit = [];
                    $accumulatedHeight = 0.0;

                    while ($i < count($rows)) {
                        $row = $rows[$i];
                        $charsPerCell = (int) floor($maxCharsPerLine / $colCount);
                        $rowLines = max(1, (int) ceil($row['maxCellTextLen'] / $charsPerCell)) + 1;
                        $rowHeight = $rowLines * $lineHeight;

                        $isLastRow = ($i === count($rows) - 1);
                        $tableSpacing = $isLastRow ? 1.0 * $lineHeight : 0.0;

                        if ($accumulatedHeight + $rowHeight + $tableSpacing > $remainingForRows) {
                            if (count($rowsToFit) === 0 && $currentHeight === 0.0) {
                                $rowsToFit[] = $row['html'];
                                $accumulatedHeight += $rowHeight;
                                $i++;
                            }
                            break;
                        }

                        $rowsToFit[] = $row['html'];
                        $accumulatedHeight += $rowHeight;
                        $i++;
                    }

                    if (count($rowsToFit) > 0) {
                        $isLastRow = ($i >= count($rows));
                        $cost = $accumulatedHeight + $headerHeight + ($isLastRow ? 1.0 * $lineHeight : 0.0);

                        $tableClass = 'section-content';
                        if (preg_match('/<table[^>]+class=["\']([^"\']+)["\']/i', $block['html'], $classMatch)) {
                            $tableClass = $classMatch[1];
                        }

                        $tableWrapperHtml = "<table class=\"{$tableClass}\">";
                        if (! empty($headerHtml)) {
                            $tableWrapperHtml .= '<thead>'.$headerHtml.'</thead>';
                        }
                        $tableWrapperHtml .= '<tbody>'.implode('', $rowsToFit).'</tbody></table>';

                        $currentPage[] = [
                            'type' => 'html',
                            'html' => $tableWrapperHtml,
                            'height' => $cost,
                        ];
                        $currentHeight += $cost;
                    } else {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;
                    }
                }

                continue;
            }
        }

        // Add last page if not empty
        if (count($currentPage) > 0) {
            $pages[] = $currentPage;
        }

        if (empty($pages)) {
            $pages[] = [
                [
                    'type' => 'patient-card',
                    'height' => $patientCardHeight,
                ],
            ];
        }

        // 4. Place Pathologist Signature Block on the last page
        $lastPageIndex = count($pages) - 1;
        $lastPageHeight = 0.0;
        foreach ($pages[$lastPageIndex] as $b) {
            $lastPageHeight += $b['height'];
        }

        $maxHeightForLastPage = $pageContentHeight;

        if ($lastPageHeight + $signatureHeight > $maxHeightForLastPage) {
            // Add a new page just for signature
            $pages[] = [
                [
                    'type' => 'signature',
                    'height' => $signatureHeight,
                ],
            ];
        } else {
            // Fits on the current last page
            $pages[$lastPageIndex][] = [
                'type' => 'signature',
                'height' => $signatureHeight,
            ];
        }

        return $pages;
    }

    public static function estimatePatientCardHeight($specimen, $customer, $referrer): float
    {
        $customerName = $customer->name ?? '';
        $referrerName = $referrer->name ?? '';
        $specimenDiagnosis = $specimen->diagnosis ?? '';
        $referrerNotes = $referrer->notes ?? '';
        $anatomicSite = $specimen->anatomic_site ?? '';

        // Left column
        $left1 = (int) ceil((8 + mb_strlen($customerName)) / 60);
        $left2 = 1; // age/gender
        $left3 = (int) ceil((18 + mb_strlen($referrerName)) / 60);
        $left4 = (int) ceil((21 + mb_strlen($specimenDiagnosis)) / 60);
        $leftLines = $left1 + $left2 + $left3 + $left4;

        // Right column
        $right1 = (int) ceil((18 + mb_strlen($referrerNotes)) / 50);
        $right2 = (int) ceil((29 + mb_strlen($anatomicSite)) / 50);
        $rightLines = $right1 + $right2 + 2;

        $totalLines = max($leftLines, $rightLines) + 2;

        return $totalLines * 3.97;
    }

    public static function parseHtmlToBlocks(string $html): array
    {
        if (empty($html)) {
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

    public static function classifyBlock(string $blockHtml, int $maxCharsPerLine): array
    {
        preg_match('/^<([a-zA-Z0-9]+)/', $blockHtml, $matches);
        $tag = isset($matches[1]) ? strtolower($matches[1]) : 'p';

        if (str_contains($blockHtml, 'data-type="image-grid"')) {
            $columns = 2;
            if (preg_match('/data-columns=["\'](\d+)["\']/i', $blockHtml, $colMatch)) {
                $columns = (int) $colMatch[1];
            }
            if ($columns < 1) {
                $columns = 2;
            }

            $imgCount = preg_match_all('/<img/i', $blockHtml, $imgMatches);
            if ($imgCount === 0) {
                $imgCount = 1;
            }

            $rows = (int) ceil($imgCount / $columns);
            
            // Available width inside page container (215.9mm - 30mm margins = 185.9mm)
            $itemWidth = 185.9 / $columns;
            $itemHeight = $itemWidth * 0.65;
            $gridHeight = ($rows * $itemHeight) + (($rows - 1) * 3.18) + 5.3;

            return [
                'type' => 'image',
                'html' => $blockHtml,
                'height' => $gridHeight,
            ];
        }

        if (str_contains($blockHtml, 'page-break') || str_contains($blockHtml, 'page-break-after') || str_contains($blockHtml, 'break-after')) {
            return [
                'type' => 'page-break',
                'html' => $blockHtml,
                'height' => 0.0,
            ];
        }

        if (in_array($tag, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])) {
            $height = 7.94; // 2 lines * 3.97
            if ($tag === 'h1') {
                $height = 11.91;
            } // 3 lines * 3.97
            elseif ($tag === 'h2') {
                $height = 9.925;
            } // 2.5 lines * 3.97

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
                'height' => 0.0,
            ];
        }

        if ($tag === 'table') {
            return [
                'type' => 'table',
                'html' => $blockHtml,
                'height' => 0.0,
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

        $class = '';
        if (preg_match('/class=["\']([^"\']+)["\']/i', $blockHtml, $classMatch)) {
            $class = $classMatch[1];
        }

        $plainText = trim(strip_tags($blockHtml));
        $lines = max(1, (int) ceil(mb_strlen($plainText) / $maxCharsPerLine));

        return [
            'type' => 'paragraph',
            'tag' => $tag,
            'html' => $blockHtml,
            'class' => $class,
            'height' => $lines * 3.97,
        ];
    }

    public static function getInnerHtml(string $html, string $tag): string
    {
        $pattern = '/^<'.$tag.'[^>]*>(.*)<\/'.$tag.'>$/us';
        if (preg_match($pattern, $html, $matches)) {
            return $matches[1];
        }

        return $html;
    }

    public static function splitHtmlIntoLines(string $html, int $maxCharsPerLine = 140): array
    {
        if (empty($html)) {
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
                } elseif (str_ends_with($token, '/>') || strtolower($token) === '<br>' || strtolower($token) === '<br/>') {
                    if (strtolower($token) === '<br>' || strtolower($token) === '<br/>') {
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

    public static function getImageHeight(string $blockHtml): float
    {
        preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $blockHtml, $srcMatch);
        preg_match('/<img[^>]+height=["\'](\d+)["\']/i', $blockHtml, $heightMatch);
        preg_match('/<img[^>]+width=["\'](\d+)["\']/i', $blockHtml, $widthMatch);

        $height = isset($heightMatch[1]) ? (int) $heightMatch[1] : null;
        $width = isset($widthMatch[1]) ? (int) $widthMatch[1] : null;

        if (! $height && isset($srcMatch[1])) {
            $src = $srcMatch[1];
            $localPath = null;

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
                    $width = $info[0];
                    $height = $info[1];
                }
            }
        }

        if ($height && $width) {
            if ($width > 704) {
                $height = (int) round($height * (704 / $width));
            }
            $heightMm = $height * 25.4 / 96;

            return $heightMm + 7.94;
        }

        return 47.64;
    }

    public static function paginateList(string $listHtml): array
    {
        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?>'.$listHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $list = $dom->getElementsByTagName('ul')->item(0);
        $tag = 'ul';
        if (! $list) {
            $list = $dom->getElementsByTagName('ol')->item(0);
            $tag = 'ol';
        }

        if (! $list) {
            return ['tag' => 'ul', 'items' => []];
        }

        $items = [];
        $liElements = $list->getElementsByTagName('li');
        foreach ($liElements as $li) {
            $items[] = $dom->saveHTML($li);
        }

        return [
            'tag' => $tag,
            'items' => $items,
        ];
    }

    public static function paginateTable(string $tableHtml, int $maxCharsPerLine): array
    {
        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?>'.$tableHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $table = $dom->getElementsByTagName('table')->item(0);

        if (! $table) {
            return ['headerHtml' => '', 'rows' => [], 'colCount' => 1];
        }

        $headerHtml = '';
        $rows = [];
        $colCount = 1;

        $trElements = $table->getElementsByTagName('tr');
        foreach ($trElements as $tr) {
            $isHeader = false;
            if ($tr->parentNode->nodeName === 'thead' || $tr->getElementsByTagName('th')->length > 0) {
                $isHeader = true;
            }

            $trHtml = $dom->saveHTML($tr);

            if ($isHeader) {
                $headerHtml .= $trHtml;
                $cells = $tr->getElementsByTagName('th');
                if ($cells->length > 0) {
                    $colCount = max($colCount, $cells->length);
                }
            } else {
                $cells = $tr->getElementsByTagName('td');
                if ($cells->length > 0) {
                    $colCount = max($colCount, $cells->length);
                }

                $maxCellTextLen = 0;
                foreach ($cells as $cell) {
                    $maxCellTextLen = max($maxCellTextLen, mb_strlen(trim($cell->textContent)));
                }

                $rows[] = [
                    'html' => $trHtml,
                    'maxCellTextLen' => $maxCellTextLen,
                ];
            }
        }

        return [
            'headerHtml' => $headerHtml,
            'rows' => $rows,
            'colCount' => $colCount,
        ];
    }
}
