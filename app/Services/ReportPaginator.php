<?php

namespace App\Services;

class ReportPaginator
{
    public static function paginate($specimen, $report, $customer, $referrer, $isMicroscopyVisible): array
    {
        $maxLinesPerPage = 48;
        $maxCharsPerLine = 85;
        $signatureLines = 5;

        // 1. Calculate Patient Metadata Card height (lines)
        $patientCardLines = self::estimatePatientCardLines($specimen, $customer, $referrer);

        // 2. Build stream of content blocks
        $blocks = [];

        // Patient Card block (added first)
        $blocks[] = [
            'type' => 'patient-card',
            'lines' => $patientCardLines
        ];

        // Diagnosis Section
        $diagHtml = !empty($report->diagnosis_html) ? $report->diagnosis_html : ($specimen->diagnosis ?? '');
        if (!empty($diagHtml)) {
            $blocks[] = [
                'type' => 'section-header',
                'title' => 'DIAGNÓSTICO',
                'lines' => 2
            ];
            $diagBlocks = self::parseHtmlToBlocks($diagHtml);
            foreach ($diagBlocks as $bHtml) {
                $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
            }
        }

        // Macroscopy Section
        $macroHtml = !empty($report->macroscopy_html) ? $report->macroscopy_html : '<i>Pendiente de revisión macroscópica.</i>';
        $blocks[] = [
            'type' => 'section-header',
            'title' => 'DESCRIPCIÓN MACROSCÓPICA',
            'lines' => 2
        ];
        $macroBlocks = self::parseHtmlToBlocks($macroHtml);
        foreach ($macroBlocks as $bHtml) {
            $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
        }

        // Microscopy Section (if visible)
        if ($isMicroscopyVisible) {
            $microHtml = !empty($report->microscopy_html) ? $report->microscopy_html : '<i>Pendiente de revisión microscópica.</i>';
            $blocks[] = [
                'type' => 'section-header',
                'title' => 'DESCRIPCIÓN MICROSCÓPICA',
                'lines' => 2
            ];
            $microBlocks = self::parseHtmlToBlocks($microHtml);
            foreach ($microBlocks as $bHtml) {
                $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
            }
        }

        // 3. Paginate the stream of blocks
        $pages = [];
        $currentPage = [];
        $currentLines = 0.0;
        $pageIndex = 0;

        for ($bIndex = 0; $bIndex < count($blocks); $bIndex++) {
            $block = $blocks[$bIndex];
            $maxLinesForPage = ($pageIndex === 0) ? ($maxLinesPerPage - $patientCardLines) : $maxLinesPerPage;

            if ($block['type'] === 'patient-card') {
                $currentPage[] = $block;
                $currentLines += $block['lines'];
                continue;
            }

            if ($block['type'] === 'section-header') {
                // If section header doesn't fit on this page, push to next
                if ($currentLines + $block['lines'] > $maxLinesForPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentLines = 0.0;
                    $pageIndex++;
                    $maxLinesForPage = $maxLinesPerPage;
                }
                $currentPage[] = $block;
                $currentLines += $block['lines'];
                continue;
            }

            if ($block['type'] === 'page-break') {
                if (count($currentPage) > 0) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentLines = 0.0;
                    $pageIndex++;
                }
                continue;
            }

            if ($block['type'] === 'heading') {
                $headingCost = $block['lines'];
                $nextBlockStartsNewPage = false;

                // Keep with Next constraint
                if ($bIndex + 1 < count($blocks)) {
                    $nextBlock = $blocks[$bIndex + 1];
                    $minNextLines = 2.0;

                    if ($nextBlock['type'] === 'image') {
                        $minNextLines = (float)$nextBlock['lines'];
                    } elseif ($nextBlock['type'] === 'heading') {
                        $minNextLines = (float)$nextBlock['lines'];
                    }

                    if ($currentLines + $headingCost + $minNextLines > $maxLinesForPage) {
                        $nextBlockStartsNewPage = true;
                    }
                }

                if ($currentLines + $headingCost > $maxLinesForPage || $nextBlockStartsNewPage) {
                    if (count($currentPage) > 0) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentLines = 0.0;
                        $pageIndex++;
                        $maxLinesForPage = $maxLinesPerPage;
                    }
                }

                $currentPage[] = $block;
                $currentLines += $headingCost;
                continue;
            }

            if ($block['type'] === 'image') {
                if ($currentLines + $block['lines'] > $maxLinesForPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentLines = 0.0;
                    $pageIndex++;
                    $maxLinesForPage = $maxLinesPerPage;
                }
                $currentPage[] = $block;
                $currentLines += $block['lines'];
                continue;
            }

            if ($block['type'] === 'paragraph') {
                $paraInnerHtml = self::getInnerHtml($block['html'], $block['tag']);
                $lines = self::splitHtmlIntoLines($paraInnerHtml, $maxCharsPerLine);

                $i = 0;
                while ($i < count($lines)) {
                    $maxLinesForPage = ($pageIndex === 0) ? ($maxLinesPerPage - $patientCardLines) : $maxLinesPerPage;
                    $remaining = $maxLinesForPage - $currentLines;

                    if ($remaining <= 0.5) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentLines = 0.0;
                        $pageIndex++;
                        continue;
                    }

                    $linesToFit = min((int)floor($remaining), count($lines) - $i);
                    if ($linesToFit <= 0) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentLines = 0.0;
                        $pageIndex++;
                        continue;
                    }

                    $slice = array_slice($lines, $i, $linesToFit);
                    
                    // Is this the last slice of the paragraph?
                    $isLastSlice = ($i + $linesToFit >= count($lines));
                    $classAttr = !empty($block['class']) ? $block['class'] : 'section-content';
                    $style = $isLastSlice ? '' : 'style="margin-bottom: 0px;"';

                    $sliceHtml = "<{$block['tag']} class=\"{$classAttr}\" {$style}>" . implode('', $slice) . "</{$block['tag']}>";
                    $blockCost = $linesToFit + ($isLastSlice ? 0.5 : 0.0);

                    $currentPage[] = [
                        'type' => 'html',
                        'html' => $sliceHtml,
                        'lines' => $blockCost
                    ];

                    $currentLines += $blockCost;
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
                    $maxLinesForPage = ($pageIndex === 0) ? ($maxLinesPerPage - $patientCardLines) : $maxLinesPerPage;
                    $remaining = $maxLinesForPage - $currentLines;

                    if ($remaining <= 1.0) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentLines = 0.0;
                        $pageIndex++;
                        continue;
                    }

                    // Estimate this item's lines
                    $itemHtml = $listItems[$i];
                    $itemPlainText = trim(strip_tags($itemHtml));
                    $itemTextLines = max(1, (int)ceil(mb_strlen($itemPlainText) / ($maxCharsPerLine - 5)));

                    if ($itemTextLines > $remaining) {
                        if ($currentLines === 0) {
                            $startAttr = ($tag === 'ol' && $olStartIndex > 1) ? " start=\"{$olStartIndex}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}>" . $itemHtml . "</{$tag}>",
                                'lines' => $itemTextLines + 0.5
                            ];
                            $currentLines += $itemTextLines + 0.5;
                            $i++;
                            $olStartIndex++;
                        } else {
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentLines = 0.0;
                            $pageIndex++;
                        }
                    } else {
                        $itemsToFit = [];
                        $accumulatedTextLines = 0;

                        while ($i < count($listItems)) {
                            $nextItemHtml = $listItems[$i];
                            $nextItemPlainText = trim(strip_tags($nextItemHtml));
                            $nextItemLines = max(1, (int)ceil(mb_strlen($nextItemPlainText) / ($maxCharsPerLine - 5)));

                            $isLastOfAll = ($i === count($listItems) - 1);
                            $spacingOverhead = $isLastOfAll ? 0.5 : 0.0;

                            if ($accumulatedTextLines + $nextItemLines + $spacingOverhead > $remaining) {
                                break;
                            }

                            $itemsToFit[] = $nextItemHtml;
                            $accumulatedTextLines += $nextItemLines;
                            $i++;
                        }

                        if (count($itemsToFit) > 0) {
                            $isLastOfAll = ($i >= count($listItems));
                            $cost = $accumulatedTextLines + ($isLastOfAll ? 0.5 : 0.0);

                            $startAttr = ($tag === 'ol' && $olStartIndex > 1) ? " start=\"{$olStartIndex}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}>" . implode('', $itemsToFit) . "</{$tag}>",
                                'lines' => $cost
                            ];
                            $currentLines += $cost;
                            $olStartIndex += count($itemsToFit);
                        } else {
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentLines = 0.0;
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
                    $maxLinesForPage = ($pageIndex === 0) ? ($maxLinesPerPage - $patientCardLines) : $maxLinesPerPage;
                    $remaining = $maxLinesForPage - $currentLines;

                    if ($remaining <= 5) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentLines = 0.0;
                        $pageIndex++;
                        continue;
                    }

                    $headerLines = empty($headerHtml) ? 0 : 2;
                    $remainingForRows = $remaining - $headerLines;

                    $rowsToFit = [];
                    $accumulatedTextLines = 0;

                    while ($i < count($rows)) {
                        $row = $rows[$i];
                        $charsPerCell = (int)floor($maxCharsPerLine / $colCount);
                        $rowLines = max(1, (int)ceil($row['maxCellTextLen'] / $charsPerCell)) + 1;

                        $isLastRow = ($i === count($rows) - 1);
                        $tableSpacing = $isLastRow ? 1.0 : 0.0;

                        if ($accumulatedTextLines + $rowLines + $tableSpacing > $remainingForRows) {
                            if (count($rowsToFit) === 0 && $currentLines === 0) {
                                $rowsToFit[] = $row['html'];
                                $accumulatedTextLines += $rowLines;
                                $i++;
                            }
                            break;
                        }

                        $rowsToFit[] = $row['html'];
                        $accumulatedTextLines += $rowLines;
                        $i++;
                    }

                    if (count($rowsToFit) > 0) {
                        $isLastRow = ($i >= count($rows));
                        $cost = $accumulatedTextLines + $headerLines + ($isLastRow ? 1.0 : 0.0);

                        $tableClass = 'section-content';
                        if (preg_match('/<table[^>]+class=["\']([^"\']+)["\']/i', $block['html'], $classMatch)) {
                            $tableClass = $classMatch[1];
                        }
                        
                        $tableWrapperHtml = "<table class=\"{$tableClass}\">";
                        if (!empty($headerHtml)) {
                            $tableWrapperHtml .= "<thead>" . $headerHtml . "</thead>";
                        }
                        $tableWrapperHtml .= "<tbody>" . implode('', $rowsToFit) . "</tbody></table>";

                        $currentPage[] = [
                            'type' => 'html',
                            'html' => $tableWrapperHtml,
                            'lines' => $cost
                        ];
                        $currentLines += $cost;
                    } else {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentLines = 0.0;
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
                    'lines' => $patientCardLines
                ]
            ];
        }

        // 4. Place Pathologist Signature Block on the last page
        $lastPageIndex = count($pages) - 1;
        $lastPageLines = 0.0;
        foreach ($pages[$lastPageIndex] as $b) {
            $lastPageLines += $b['lines'];
        }

        $maxLinesForLastPage = ($lastPageIndex === 0) ? ($maxLinesPerPage - $patientCardLines) : $maxLinesPerPage;

        if ($lastPageLines + $signatureLines > $maxLinesForLastPage) {
            // Add a new page just for signature
            $pages[] = [
                [
                    'type' => 'signature',
                    'lines' => $signatureLines
                ]
            ];
        } else {
            // Fits on the current last page
            $pages[$lastPageIndex][] = [
                'type' => 'signature',
                'lines' => $signatureLines
            ];
        }

        return $pages;
    }

    public static function estimatePatientCardLines($specimen, $customer, $referrer): int
    {
        $customerName = $customer->name ?? '';
        $referrerName = $referrer->name ?? '';
        $specimenDiagnosis = $specimen->diagnosis ?? '';
        $referrerNotes = $referrer->notes ?? '';
        $anatomicSite = $specimen->anatomic_site ?? '';

        // Left column
        $left1 = (int)ceil((8 + mb_strlen($customerName)) / 60);
        $left2 = 1; // age/gender
        $left3 = (int)ceil((18 + mb_strlen($referrerName)) / 60);
        $left4 = (int)ceil((21 + mb_strlen($specimenDiagnosis)) / 60);
        $leftLines = $left1 + $left2 + $left3 + $left4;

        // Right column
        $right1 = (int)ceil((18 + mb_strlen($referrerNotes)) / 50);
        $right2 = (int)ceil((29 + mb_strlen($anatomicSite)) / 50);
        $rightLines = $right1 + $right2 + 2;

        return max($leftLines, $rightLines) + 2;
    }

    public static function parseHtmlToBlocks(string $html): array
    {
        if (empty($html)) {
            return [];
        }

        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?><div>' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $root = $dom->getElementsByTagName('div')->item(0);
        $blocks = [];

        if ($root) {
            foreach ($root->childNodes as $child) {
                if ($child->nodeType === XML_ELEMENT_NODE) {
                    $blocks[] = $dom->saveHTML($child);
                } else {
                    $text = trim($child->textContent);
                    if ($text !== '') {
                        $blocks[] = '<p>' . htmlspecialchars($text) . '</p>';
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

        if (str_contains($blockHtml, 'page-break') || str_contains($blockHtml, 'page-break-after') || str_contains($blockHtml, 'break-after')) {
            return [
                'type' => 'page-break',
                'html' => $blockHtml,
                'lines' => 0
            ];
        }

        if (in_array($tag, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])) {
            $lines = 2;
            if ($tag === 'h1') $lines = 3;
            else if ($tag === 'h2') $lines = 2.5;

            return [
                'type' => 'heading',
                'tag' => $tag,
                'html' => $blockHtml,
                'lines' => $lines
            ];
        }

        if ($tag === 'ul' || $tag === 'ol') {
            return [
                'type' => 'list',
                'tag' => $tag,
                'html' => $blockHtml,
                'lines' => 0
            ];
        }

        if ($tag === 'table') {
            return [
                'type' => 'table',
                'html' => $blockHtml,
                'lines' => 0
            ];
        }

        if ($tag === 'img' || (str_contains($blockHtml, '<img') && !str_contains($blockHtml, '<p'))) {
            $lines = self::getImageLines($blockHtml);
            return [
                'type' => 'image',
                'html' => $blockHtml,
                'lines' => $lines
            ];
        }

        $class = '';
        if (preg_match('/class=["\']([^"\']+)["\']/i', $blockHtml, $classMatch)) {
            $class = $classMatch[1];
        }

        $plainText = trim(strip_tags($blockHtml));
        $lines = max(1, (int)ceil(mb_strlen($plainText) / $maxCharsPerLine));

        return [
            'type' => 'paragraph',
            'tag' => $tag,
            'html' => $blockHtml,
            'class' => $class,
            'lines' => $lines
        ];
    }

    public static function getInnerHtml(string $html, string $tag): string
    {
        $pattern = '/^<' . $tag . '[^>]*>(.*)<\/' . $tag . '>$/us';
        if (preg_match($pattern, $html, $matches)) {
            return $matches[1];
        }
        return $html;
    }

    public static function splitHtmlIntoLines(string $html, int $maxCharsPerLine = 85): array
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

        $closeActiveTags = function() use (&$activeTagsStack) {
            $closing = '';
            for ($i = count($activeTagsStack) - 1; $i >= 0; $i--) {
                preg_match('/<([a-zA-Z0-9]+)/i', $activeTagsStack[$i], $tagMatch);
                if (isset($tagMatch[1])) {
                    $closing .= '</' . $tagMatch[1] . '>';
                }
            }
            return $closing;
        };

        $openActiveTags = function() use (&$activeTagsStack) {
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

    public static function getImageLines(string $blockHtml): int
    {
        preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $blockHtml, $srcMatch);
        preg_match('/<img[^>]+height=["\'](\d+)["\']/i', $blockHtml, $heightMatch);
        preg_match('/<img[^>]+width=["\'](\d+)["\']/i', $blockHtml, $widthMatch);

        $height = isset($heightMatch[1]) ? (int)$heightMatch[1] : null;
        $width = isset($widthMatch[1]) ? (int)$widthMatch[1] : null;

        if (!$height && isset($srcMatch[1])) {
            $src = $srcMatch[1];
            $localPath = null;

            $urlPath = parse_url($src, PHP_URL_PATH);
            if ($urlPath) {
                if (preg_match('/^\/storage\/(.+)$/', $urlPath, $storageMatches)) {
                    $localPath = storage_path('app/public/' . $storageMatches[1]);
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
                $height = (int)round($height * (704 / $width));
            }
            return (int)ceil($height / 15) + 2;
        }

        return 12;
    }

    public static function paginateList(string $listHtml): array
    {
        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $listHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $list = $dom->getElementsByTagName('ul')->item(0);
        $tag = 'ul';
        if (!$list) {
            $list = $dom->getElementsByTagName('ol')->item(0);
            $tag = 'ol';
        }

        if (!$list) {
            return ['tag' => 'ul', 'items' => []];
        }

        $items = [];
        $liElements = $list->getElementsByTagName('li');
        foreach ($liElements as $li) {
            $items[] = $dom->saveHTML($li);
        }

        return [
            'tag' => $tag,
            'items' => $items
        ];
    }

    public static function paginateTable(string $tableHtml, int $maxCharsPerLine): array
    {
        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $tableHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $table = $dom->getElementsByTagName('table')->item(0);

        if (!$table) {
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
                    'maxCellTextLen' => $maxCellTextLen
                ];
            }
        }

        return [
            'headerHtml' => $headerHtml,
            'rows' => $rows,
            'colCount' => $colCount
        ];
    }
}
