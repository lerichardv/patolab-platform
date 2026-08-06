<?php

namespace App\Services;

class ReportPaginator
{
    public static function paginate($specimen, $report, $customer, $referrer, $isMicroscopyVisible): array
    {
        $pageContentHeight = 205.00; // mm
        $lineHeight = 3.97; // mm
        $maxCharsPerLine = 155;
        $pathologistsCount = max(1, $specimen->users ? $specimen->users->count() : 1);
        $rowsCount = (int) ceil($pathologistsCount / 2);
        $signatureHeight = $rowsCount * 25.0; // 25mm per row

        // Resolve headings_toggles — defaults all sections to visible (true) when null/absent
        $headingsToggles = [];
        if (isset($report->headings_toggles)) {
            $headingsToggles = is_array($report->headings_toggles) ? $report->headings_toggles : json_decode($report->headings_toggles, true) ?? [];
        }

        // 1. Calculate Patient Metadata Card height (mm)
        $patientCardHeight = self::estimatePatientCardHeight($specimen, $customer, $referrer);

        // 2. Build stream of content blocks
        $blocks = [];

        // Patient Card block (added first)
        $blocks[] = [
            'type' => 'patient-card',
            'height' => $patientCardHeight,
        ];

        // 2. Build stream of content blocks according to sections_order
        $defaultOrder = [
            ['key' => 'clinical_details_html', 'order' => 1, 'active' => true],
            ['key' => 'diagnosis_html', 'order' => 2, 'active' => true],
            ['key' => 'macroscopy_html', 'order' => 3, 'active' => true],
            ['key' => 'microscopy_html', 'order' => 4, 'active' => true],
            ['key' => 'comments_notes_html', 'order' => 5, 'active' => true],
            ['key' => 'protocols_html', 'order' => 6, 'active' => true],
            ['key' => 'legend_html', 'order' => 7, 'active' => true],
            ['key' => 'open_text_html', 'order' => 8, 'active' => true],
        ];

        $sectionsOrder = ! empty($report->sections_order) ? $report->sections_order : $defaultOrder;

        // Sort sections by order value
        usort($sectionsOrder, function ($a, $b) {
            return $a['order'] <=> $b['order'];
        });

        $cuttingsBlock = null;
        $newCuttingsBlock = null;
        $hasPushedCuttings = false;
        $cuttings = collect();
        if (is_object($specimen) && isset($specimen->cuttings)) {
            $cuttings = $specimen->cuttings;
        }

        // Helper to build a cuttings summary block from a list of cuttings
        $buildCuttingsSummaryBlock = function (array $cuttingsList, string $blockType, string $prefix) use ($maxCharsPerLine, $lineHeight): ?array {
            if (count($cuttingsList) === 0) {
                return null;
            }

            // Sort alphabetically (by code length first, then natural comparison)
            usort($cuttingsList, function ($a, $b) {
                $codeA = (isset($a->code) && ! empty($a->code->code)) ? $a->code->code : '';
                $codeB = (isset($b->code) && ! empty($b->code->code)) ? $b->code->code : '';
                $lenA = strlen($codeA);
                $lenB = strlen($codeB);
                if ($lenA !== $lenB) {
                    return $lenA <=> $lenB;
                }

                return strnatcasecmp($codeA, $codeB);
            });

            // Find runs of contiguous items with the same description
            $tempRuns = [];
            foreach ($cuttingsList as $idx => $cutting) {
                $desc = $cutting->description ?? '';
                $lastRunIdx = count($tempRuns) - 1;
                if ($lastRunIdx >= 0 && $tempRuns[$lastRunIdx]['description'] === $desc) {
                    $tempRuns[$lastRunIdx]['endIndex'] = $idx;
                    $tempRuns[$lastRunIdx]['items'][] = $cutting;
                } else {
                    $tempRuns[] = [
                        'startIndex' => $idx,
                        'endIndex' => $idx,
                        'description' => $desc,
                        'items' => [$cutting],
                    ];
                }
            }

            $groups = [];
            foreach ($tempRuns as $run) {
                $subGroups = [];
                $currentSubGroup = [];

                foreach ($run['items'] as $item) {
                    $code = (isset($item->code) && ! empty($item->code->code)) ? $item->code->code : '';

                    if (empty($currentSubGroup)) {
                        $currentSubGroup[] = $item;
                    } else {
                        $prevItem = end($currentSubGroup);
                        $prevCode = (isset($prevItem->code) && ! empty($prevItem->code->code)) ? $prevItem->code->code : '';

                        if (self::areTwoCodesConsecutive($prevCode, $code)) {
                            $currentSubGroup[] = $item;
                        } else {
                            $subGroups[] = $currentSubGroup;
                            $currentSubGroup = [$item];
                        }
                    }
                }
                if (! empty($currentSubGroup)) {
                    $subGroups[] = $currentSubGroup;
                }

                $startIdxInCuttingsList = $run['startIndex'];
                foreach ($subGroups as $sub) {
                    $subCount = count($sub);
                    $totalCuts = 0;
                    foreach ($sub as $item) {
                        $totalCuts += $item->number_of_cuttings ?? 0;
                    }

                    $endIdxInCuttingsList = $startIdxInCuttingsList + $subCount - 1;

                    $groups[] = [
                        'startIndex' => $startIdxInCuttingsList,
                        'endIndex' => $endIdxInCuttingsList,
                        'description' => $run['description'],
                        'totalCuts' => $totalCuts,
                        'count' => $subCount,
                    ];

                    $startIdxInCuttingsList += $subCount;
                }
            }

            $cutsList = [];
            foreach ($groups as $g) {
                $startCutting = $cuttingsList[$g['startIndex']] ?? null;
                $endCutting = $cuttingsList[$g['endIndex']] ?? null;

                $startLetter = (isset($startCutting->code) && ! empty($startCutting->code->code))
                    ? $startCutting->code->code
                    : self::indexToLetter($g['startIndex'] + 1);

                $endLetter = (isset($endCutting->code) && ! empty($endCutting->code->code))
                    ? $endCutting->code->code
                    : self::indexToLetter($g['endIndex'] + 1);

                $label = $g['startIndex'] === $g['endIndex']
                    ? $startLetter
                    : $startLetter.'-'.$endLetter;

                $formattedDesc = $g['description'] !== '' ? $g['description'].' ' : '';
                $cutsList[] = "{$label}) {$formattedDesc}{$g['totalCuts']}x{$g['count']}";
            }

            $concatenatedCuts = $prefix.' '.implode('; ', $cutsList).'.';
            $charsCount = mb_strlen($concatenatedCuts);
            $lines = max(1, (int) ceil($charsCount / $maxCharsPerLine));
            $cutsHeight = $lines * $lineHeight + 2.0;

            return [
                'type' => $blockType,
                'text' => $concatenatedCuts,
                'height' => $cutsHeight,
            ];
        };

        if ($cuttings->count() > 0) {
            $regularCuttings = $cuttings->filter(fn ($c) => ! $c->is_new_cut)->values()->all();
            $newCuttings = $cuttings->filter(fn ($c) => $c->is_new_cut)->values()->all();

            $cuttingsBlock = $buildCuttingsSummaryBlock($regularCuttings, 'cuttings-summary', 'Cortes:');
            $newCuttingsBlock = $buildCuttingsSummaryBlock($newCuttings, 'new-cuttings-summary', 'Nuevos Cortes:');
        }

        foreach ($sectionsOrder as $sec) {
            $key = $sec['key'];
            $active = $sec['active'] ?? true;
            if (! $active) {
                continue;
            }

            // Determine whether this section's heading title should be rendered.
            // Defaults to true (visible) when not specified in headings_toggles.
            $showHeading = $headingsToggles[$key] ?? true;

            if ($key === 'clinical_details_html') {
                $clinHtml = ! empty($report->clinical_details_html) ? $report->clinical_details_html : '';
                if (! self::isEmptyHtml($clinHtml)) {
                    if ($showHeading) {
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => 'DATOS CLÍNICOS',
                            'height' => 7.94,
                        ];
                    }
                    $clinBlocks = self::parseHtmlToBlocks($clinHtml);
                    foreach ($clinBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }
            } elseif ($key === 'diagnosis_html') {
                $diagHtml = ! empty($report->diagnosis_html) ? $report->diagnosis_html : ($specimen->diagnosis ?? '');
                if (! self::isEmptyHtml($diagHtml)) {
                    if ($showHeading) {
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => 'DIAGNÓSTICO',
                            'height' => 7.94,
                        ];
                    }
                    $diagBlocks = self::parseHtmlToBlocks($diagHtml);
                    foreach ($diagBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }
            } elseif ($key === 'macroscopy_html') {
                $macroHtml = ! empty($report->macroscopy_html) ? $report->macroscopy_html : '';
                if (! self::isEmptyHtml($macroHtml)) {
                    if ($showHeading) {
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => 'DESCRIPCIÓN MACROSCÓPICA',
                            'height' => 7.94,
                        ];
                    }
                    $macroBlocks = self::parseHtmlToBlocks($macroHtml);
                    foreach ($macroBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }

                if (! $hasPushedCuttings) {
                    if ($cuttingsBlock) {
                        $blocks[] = $cuttingsBlock;
                    }
                    if ($newCuttingsBlock) {
                        $blocks[] = $newCuttingsBlock;
                    }
                    $hasPushedCuttings = true;
                }
            } elseif ($key === 'microscopy_html') {
                if ($isMicroscopyVisible) {
                    $microHtml = ! empty($report->microscopy_html) ? $report->microscopy_html : '';
                    if (! self::isEmptyHtml($microHtml)) {
                        if ($showHeading) {
                            $blocks[] = [
                                'type' => 'section-header',
                                'title' => 'DESCRIPCIÓN MICROSCÓPICA',
                                'height' => 7.94,
                            ];
                        }
                        $microBlocks = self::parseHtmlToBlocks($microHtml);
                        foreach ($microBlocks as $bHtml) {
                            $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                        }
                    }
                }
            } elseif ($key === 'comments_notes_html') {
                $commHtml = ! empty($report->comments_notes_html) ? $report->comments_notes_html : '';
                if (! self::isEmptyHtml($commHtml)) {
                    if ($showHeading) {
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => 'COMENTARIOS Y NOTAS',
                            'height' => 7.94,
                        ];
                    }
                    $commBlocks = self::parseHtmlToBlocks($commHtml);
                    foreach ($commBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }
            } elseif ($key === 'protocols_html') {
                $protHtml = ! empty($report->protocols_html) ? $report->protocols_html : '';
                if (! self::isEmptyHtml($protHtml)) {
                    if ($showHeading) {
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => 'PROTOCOLOS',
                            'height' => 7.94,
                        ];
                    }
                    $protBlocks = self::parseHtmlToBlocks($protHtml);
                    foreach ($protBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }
            } elseif ($key === 'legend_html') {
                $legHtml = ! empty($report->legend_html) ? $report->legend_html : '';
                if (! self::isEmptyHtml($legHtml)) {
                    if ($showHeading) {
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => 'LEYENDA',
                            'height' => 7.94,
                        ];
                    }
                    $legBlocks = self::parseHtmlToBlocks($legHtml);
                    foreach ($legBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }
            } elseif ($key === 'open_text_html') {
                $openHtml = ! empty($report->open_text_html) ? $report->open_text_html : '';
                if (! self::isEmptyHtml($openHtml)) {
                    if ($showHeading) {
                        $openLabel = ! empty($report->open_text_label) ? $report->open_text_label : 'Texto Libre';
                        $blocks[] = [
                            'type' => 'section-header',
                            'title' => mb_strtoupper($openLabel),
                            'height' => 7.94,
                        ];
                    }
                    $openBlocks = self::parseHtmlToBlocks($openHtml);
                    foreach ($openBlocks as $bHtml) {
                        $blocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
                    }
                }
            }
        }

        if (! $hasPushedCuttings) {
            if ($cuttingsBlock) {
                $blocks[] = $cuttingsBlock;
            }
            if ($newCuttingsBlock) {
                $blocks[] = $newCuttingsBlock;
            }
        }

        // 3. Paginate the stream of blocks
        $pages = self::paginateBlocks($blocks, $pageContentHeight, $lineHeight, $maxCharsPerLine);

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

        // 5. Paginate addendum onto new pages if it has content
        $addendumHtml = ! empty($report->addendum_html) ? $report->addendum_html : '';
        if (! self::isEmptyHtml($addendumHtml)) {
            $addendumBlocks = [];
            $showAddendumHeading = $headingsToggles['addendum_html'] ?? true;
            if ($showAddendumHeading) {
                $addendumBlocks[] = [
                    'type' => 'section-header',
                    'title' => 'ADDENDUM',
                    'height' => 7.94,
                ];
            }
            $rawAddendumBlocks = self::parseHtmlToBlocks($addendumHtml);
            foreach ($rawAddendumBlocks as $bHtml) {
                $addendumBlocks[] = self::classifyBlock($bHtml, $maxCharsPerLine);
            }

            $addendumPages = self::paginateBlocks($addendumBlocks, $pageContentHeight, $lineHeight, $maxCharsPerLine);
            foreach ($addendumPages as $aPage) {
                $pages[] = $aPage;
            }
        }

        return $pages;
    }

    public static function isEmptyHtml(?string $html): bool
    {
        if (empty($html)) {
            return true;
        }

        if (str_contains($html, '<img') || str_contains($html, '<table') || str_contains($html, '<tr') || str_contains($html, '<td')) {
            return false;
        }

        $text = html_entity_decode(strip_tags($html));
        $text = str_replace("\xc2\xa0", ' ', $text);
        $text = preg_replace('/\s+/', '', $text);

        return $text === '';
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

            $align = 'center';
            if (preg_match('/data-align=["\']([^"\']+)["\']/i', $blockHtml, $alignMatch)) {
                $align = $alignMatch[1];
            }

            $width = null;
            if (preg_match('/(?:width|data-width)=["\'](\d+)["\']/i', $blockHtml, $widthMatch)) {
                $width = (int) $widthMatch[1];
            }

            preg_match_all('/<img[^>]+>/i', $blockHtml, $imgMatches);
            $imgTags = $imgMatches[0] ?? [];
            if (empty($imgTags)) {
                $imgTags = [];
            }
            $imgTags = array_slice($imgTags, 0, 4);
            $columns = count($imgTags);
            if ($columns < 1) {
                $columns = 1;
            }

            $usableWidth = $width ? (185.9 * ($width / 704.0)) : 185.9;
            $gap = 1.50; // mm
            $gridHeight = 2.0;

            $aspectSum = 0.0;
            foreach ($imgTags as $imgTag) {
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

            $N = count($imgTags);
            $rowHeight = 0.0;
            if ($N > 0) {
                $calculatedHeight = ($usableWidth - ($N - 1) * $gap) / $aspectSum;
                $maxRowHeight = $N === 1 ? min(120.0, $usableWidth) : ($usableWidth * 1.5);
                $rowHeight = min($calculatedHeight, $maxRowHeight);
            }
            $gridHeight += $rowHeight;

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

    public static function splitHtmlIntoLines(string $html, int $maxCharsPerLine = 155): array
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
            $localPath = null;

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

        $listStyleType = $list->getAttribute('data-list-style-type') ?: null;
        $styleAttr = $list->getAttribute('style') ?: null;

        $items = [];
        $liElements = $list->getElementsByTagName('li');
        foreach ($liElements as $li) {
            $items[] = $dom->saveHTML($li);
        }

        return [
            'tag' => $tag,
            'items' => $items,
            'listStyleType' => $listStyleType,
            'styleAttr' => $styleAttr,
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

    public static function letterToIndex(string $letter): int
    {
        $index = 0;
        $len = strlen($letter);
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($letter[$i]) - 64);
        }

        return $index;
    }

    public static function indexToLetter(int $index): string
    {
        $letter = '';
        while ($index > 0) {
            $temp = ($index - 1) % 26;
            $letter = chr(65 + $temp).$letter;
            $index = intval(($index - $temp - 1) / 26);
        }

        return $letter;
    }

    public static function areTwoCodesConsecutive(string $code1, string $code2): bool
    {
        $len1 = strlen($code1);
        $len2 = strlen($code2);
        if ($len1 !== $len2 || $len1 === 0) {
            return false;
        }

        if ($len1 > 1) {
            $pref1 = substr($code1, 0, $len1 - 1);
            $pref2 = substr($code2, 0, $len2 - 1);
            if ($pref1 !== $pref2) {
                return false;
            }
        }

        $lastChar1 = ord(substr($code1, -1));
        $lastChar2 = ord(substr($code2, -1));

        return $lastChar2 === $lastChar1 + 1;
    }

    public static function paginateBlocks(array $blocks, float $pageContentHeight, float $lineHeight, int $maxCharsPerLine): array
    {
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

            if ($block['type'] === 'image-grid') {
                $columns = $block['columns'];
                $images = $block['images'];

                if (empty($images)) {
                    $currentPage[] = [
                        'type' => 'html',
                        'html' => $block['html'],
                        'height' => 5.3,
                    ];
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
                }

                while (! empty($rowsRemaining)) {
                    $maxHeightForPage = $pageContentHeight;
                    $remaining = $maxHeightForPage - $currentHeight;

                    // The index of the first row currently remaining
                    $totalRows = count($rowHeights);
                    $currentIndex = $totalRows - count($rowsRemaining);

                    $minGridHeight = $rowHeights[$currentIndex] + 2.0;

                    if ($remaining < $minGridHeight && count($currentPage) > 0) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;

                        continue;
                    }

                    // Find how many rows can fit in the remaining height
                    $r = 0;
                    for ($tempR = 1; $tempR <= count($rowsRemaining); $tempR++) {
                        $cost = 2.0;
                        for ($i = 0; $i < $tempR; $i++) {
                            $cost += $rowHeights[$currentIndex + $i];
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

                    // If we can't fit even one row
                    if ($r === 0) {
                        if (count($currentPage) > 0) {
                            // Move to next page
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentHeight = 0.0;

                            continue;
                        } else {
                            // Already on empty page, force 1 row to prevent infinite loop
                            $r = 1;
                        }
                    }

                    // Build the slice of rows
                    $sliceImages = [];
                    for ($i = 0; $i < $r; $i++) {
                        $rowIdx = $currentIndex + $i;
                        $rowImages = $rowsRemaining[$i];
                        $H_j = $rowHeights[$rowIdx];

                        foreach ($rowImages as $imgTag) {
                            $aspect = self::getImageAspectRatio($imgTag);
                            $widthMm = $aspect > 0.0 ? ($H_j / $aspect) : $H_j;
                            $styleRule = "height: {$H_j}mm; width: {$widthMm}mm; object-fit: cover;";

                            if (preg_match('/style=["\']([^"\']*)["\']/i', $imgTag, $styleMatch)) {
                                $existingStyle = rtrim($styleMatch[1], ';');
                                $newStyle = "{$existingStyle}; {$styleRule}";
                                $imgTag = preg_replace('/style=["\']([^"\']*)["\']/i', 'style="'.$newStyle.'"', $imgTag);
                            } else {
                                $imgTag = str_replace('<img', '<img style="'.$styleRule.'"', $imgTag);
                            }
                            $sliceImages[] = $imgTag;
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
                        $cost += $rowHeights[$currentIndex + $i];
                        if ($i > 0) {
                            $cost += 1.5;
                        }
                    }

                    $currentPage[] = [
                        'type' => 'html',
                        'html' => $sliceHtml,
                        'height' => $cost,
                    ];

                    $currentHeight += $cost;
                    $rowsRemaining = array_slice($rowsRemaining, $r);
                }

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

            if ($block['type'] === 'cuttings-summary' || $block['type'] === 'new-cuttings-summary') {
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
                            $listStyleAttr = ! empty($listData['listStyleType']) ? " data-list-style-type=\"{$listData['listStyleType']}\"" : '';
                            $styleAttr = ! empty($listData['styleAttr']) ? " style=\"{$listData['styleAttr']}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}{$listStyleAttr}{$styleAttr}>".$itemHtml."</{$tag}>",
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
                            $listStyleAttr = ! empty($listData['listStyleType']) ? " data-list-style-type=\"{$listData['listStyleType']}\"" : '';
                            $styleAttr = ! empty($listData['styleAttr']) ? " style=\"{$listData['styleAttr']}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}{$listStyleAttr}{$styleAttr}>".implode('', $itemsToFit)."</{$tag}>",
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

        return $pages;
    }
}
