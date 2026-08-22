<?php

namespace App\Services;

class ReportPaginator
{
    public static function paginate($specimen, $report, $customer, $referrer, $isMicroscopyVisible): array
    {
        $pageContentHeight = 212.79; // mm
        $lineHeight = 3.53; // mm (8pt * 1.25)
        $maxCharsPerLine = 144;
        $pathologistsCount = $specimen->users ? $specimen->users->count() : 0;
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

            // Find runs of contiguous items with the same description and prefix
            $tempRuns = [];
            foreach ($cuttingsList as $idx => $cutting) {
                $desc = $cutting->description ?? '';
                $cuttingPrefix = (isset($cutting->prefix) && ! empty($cutting->prefix->prefix)) ? $cutting->prefix->prefix : '';
                $lastRunIdx = count($tempRuns) - 1;
                if ($lastRunIdx >= 0 && $tempRuns[$lastRunIdx]['description'] === $desc && $tempRuns[$lastRunIdx]['prefix'] === $cuttingPrefix) {
                    $tempRuns[$lastRunIdx]['endIndex'] = $idx;
                    $tempRuns[$lastRunIdx]['items'][] = $cutting;
                } else {
                    $tempRuns[] = [
                        'startIndex' => $idx,
                        'endIndex' => $idx,
                        'description' => $desc,
                        'prefix' => $cuttingPrefix,
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
                        'prefix' => $run['prefix'],
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
                $cutsVal = ($g['totalCuts'] === 0 && ! empty($g['prefix'])) ? $g['prefix'] : (! empty($g['prefix']) ? $g['prefix'].' '.$g['totalCuts'] : $g['totalCuts']);
                $cutsList[] = "{$label}) {$formattedDesc}{$cutsVal}x{$g['count']}";
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

                /*
                if (! $hasPushedCuttings) {
                    if ($cuttingsBlock) {
                        $blocks[] = $cuttingsBlock;
                    }
                    if ($newCuttingsBlock) {
                        $blocks[] = $newCuttingsBlock;
                    }
                    $hasPushedCuttings = true;
                }
                */
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

        /*
        if (! $hasPushedCuttings) {
            if ($cuttingsBlock) {
                $blocks[] = $cuttingsBlock;
            }
            if ($newCuttingsBlock) {
                $blocks[] = $newCuttingsBlock;
            }
        }
        */

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

        if ($signatureHeight > 0) {
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

        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?><div>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $root = $dom->getElementsByTagName('div')->item(0);
        if (! $root) {
            return true;
        }

        $significantNodes = [];
        foreach ($root->childNodes as $child) {
            if ($child->nodeType === XML_TEXT_NODE) {
                if (trim($child->textContent) !== '') {
                    $significantNodes[] = $child;
                }
            } else {
                $significantNodes[] = $child;
            }
        }

        if (empty($significantNodes)) {
            return true;
        }

        if (count($significantNodes) === 1) {
            $node = $significantNodes[0];
            if (strtolower($node->nodeName) === 'p') {
                $innerHtml = '';
                foreach ($node->childNodes as $c) {
                    $innerHtml .= $dom->saveHTML($c);
                }
                $innerTrimmed = trim($innerHtml);
                $isBrOnly = (bool) preg_match('/^<br\b[^>]*>$/i', $innerTrimmed);

                return $innerTrimmed === '' || $isBrOnly || $innerTrimmed === '&nbsp;' || $innerTrimmed === "\xc2\xa0";
            }
        }

        return false;
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

        if ($tag === 'table' || str_contains($blockHtml, '<table')) {
            return [
                'type' => 'table',
                'html' => $blockHtml,
                'height' => 0.0,
            ];
        }

        if ($tag === 'img' || (str_contains($blockHtml, '<img') && ! str_contains($blockHtml, '<p'))) {
            $height = self::getImageHeight($blockHtml);

            // Parse img details
            preg_match('/src=["\']([^"\']+)["\']/i', $blockHtml, $srcMatch);
            $src = $srcMatch ? $srcMatch[1] : '';

            preg_match('/width=["\'](\d+)["\']/i', $blockHtml, $widthMatch);
            if (! $widthMatch) {
                preg_match('/width:\s*(\d+)px/i', $blockHtml, $widthMatch);
            }
            $width = $widthMatch ? $widthMatch[1].'px' : 'auto';

            preg_match('/height=["\'](\d+)["\']/i', $blockHtml, $heightMatch);
            if (! $heightMatch) {
                preg_match('/height:\s*(\d+)px/i', $blockHtml, $heightMatch);
            }
            $heightVal = $heightMatch ? $heightMatch[1].'px' : 'auto';

            preg_match('/data-align=["\']([^"\']+)["\']/i', $blockHtml, $alignMatch);
            if (! $alignMatch) {
                preg_match('/class=["\']([^"\']*align-[^"\']*)["\']/i', $blockHtml, $alignMatch);
            }
            $align = 'center';
            if ($alignMatch) {
                $alignVal = $alignMatch[1];
                if (str_contains($alignVal, 'left')) {
                    $align = 'left';
                } elseif (str_contains($alignVal, 'right')) {
                    $align = 'right';
                } elseif (str_contains($alignVal, 'justify')) {
                    $align = 'justify';
                }
            }

            preg_match('/data-caption=["\']([^"\']+)["\']/i', $blockHtml, $captionMatch);
            if (! $captionMatch) {
                preg_match('/alt=["\']([^"\']+)["\']/i', $blockHtml, $captionMatch);
            }
            $caption = $captionMatch ? htmlspecialchars($captionMatch[1]) : '';

            $isLeft = $align === 'left';
            $isRight = $align === 'right';
            $marginLeft = $isLeft ? '0' : 'auto';
            $marginRight = $isRight ? '0' : 'auto';

            $imgStyles = ['display: block', 'max-width: 100%', 'height: '.$heightVal];
            if ($width !== 'auto') {
                $imgStyles[] = 'width: '.$width;
            } else {
                $imgStyles[] = 'width: auto';
            }

            $captionHtml = '';
            if ($caption) {
                $captionHtml = '<div class="image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2;">'.$caption.'</div>';
                $widthPx = $widthMatch ? (int) $widthMatch[1] : 360;
                $maxCharsForCaption = max(15, (int) floor($widthPx * 0.176));
                $captionLines = max(1, (int) ceil(mb_strlen($caption) / $maxCharsForCaption));
                $height += $captionLines * 3.60 + 1.06;
            }

            $wrappedHtml = '<div class="image-wrapper align-'.$align.'" style="display: block; margin-left: '.$marginLeft.'; margin-right: '.$marginRight.'; width: fit-content; max-width: 100%;">'.
                '<img src="'.$src.'" class="align-'.$align.'" style="'.implode('; ', $imgStyles).'" />'.
                $captionHtml.
                '</div>';

            return [
                'type' => 'image',
                'html' => $wrappedHtml,
                'height' => $height,
            ];
        }

        $class = '';
        if (preg_match('/class=["\']([^"\']+)["\']/i', $blockHtml, $classMatch)) {
            $class = $classMatch[1];
        }

        $plainText = html_entity_decode(trim(strip_tags($blockHtml)), ENT_QUOTES, 'UTF-8');
        $fontLh = self::getBlockLineHeight(['html' => $blockHtml], 3.53);
        $fontSize = $fontLh / 1.25;
        $baseFontSize = 2.82;
        $dynamicMaxChars = (int) floor($maxCharsPerLine * ($baseFontSize / $fontSize));
        $lines = max(1, (int) ceil(mb_strlen($plainText) / $dynamicMaxChars));

        return [
            'type' => 'paragraph',
            'tag' => $tag,
            'html' => $blockHtml,
            'class' => $class,
            'height' => $lines * self::getBlockLineHeight(['html' => $blockHtml], 3.53),
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

    public static function getRootElementAttributes(string $htmlStr): array
    {
        if (empty($htmlStr)) {
            return ['style' => '', 'extraAttrs' => ''];
        }

        $dom = new \DOMDocument;
        @$dom->loadHTML('<?xml encoding="utf-8" ?><div>'.$htmlStr.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        $root = $dom->getElementsByTagName('div')->item(0);
        if ($root && $root->firstElementChild) {
            $elem = $root->firstElementChild;
            $styleAttr = $elem->getAttribute('style') ?: '';

            $extraAttrs = '';
            foreach ($elem->attributes as $attr) {
                if ($attr->name !== 'style' && $attr->name !== 'class' && $attr->name !== 'id') {
                    $extraAttrs .= ' '.$attr->name.'="'.htmlspecialchars($attr->value, ENT_QUOTES).'"';
                }
            }

            return ['style' => $styleAttr, 'extraAttrs' => $extraAttrs];
        }

        return ['style' => '', 'extraAttrs' => ''];
    }

    public static function getBlockLineHeight(array $block, float $baseLineHeight): float
    {
        if (empty($block['html'])) {
            return $baseLineHeight;
        }

        $html = $block['html'];
        $fontSize = 2.82; // Default 8pt in mm

        $hasPt = false;
        $hasPx = false;
        $maxPt = 8.0;
        $maxPx = 10.66;

        if (preg_match_all('/font-size:\s*([\d\.]+)pt/i', $html, $matches)) {
            foreach ($matches[1] as $val) {
                $valFloat = (float) $val;
                if ($valFloat > $maxPt) {
                    $maxPt = $valFloat;
                }
            }
            $hasPt = true;
        }

        if (! $hasPt && preg_match_all('/font-size:\s*([\d\.]+)px/i', $html, $matches)) {
            foreach ($matches[1] as $val) {
                $valFloat = (float) $val;
                if ($valFloat > $maxPx) {
                    $maxPx = $valFloat;
                }
            }
            $hasPx = true;
        }

        if ($hasPt) {
            $fontSize = $maxPt * 0.352777;
        } elseif ($hasPx) {
            $fontSize = $maxPx * 0.264583;
        }

        $multiplier = 1.25; // Default multiplier
        if (preg_match('/line-height:\s*([\d\.]+)/i', $html, $matches)) {
            $multiplier = (float) $matches[1];
        }

        return $fontSize * $multiplier;
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

    public static function paginateList(string $listHtml, int $maxCharsPerLine = 155, float $fontLineHeight = 3.53, float $itemSpacing = 0.8): array
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
        $liList = [];
        foreach ($liElements as $li) {
            $liList[] = $li;
        }
        $totalItems = count($liList);

        $listCharsPerLine = max(20, $maxCharsPerLine - 15);

        foreach ($liList as $idx => $li) {
            $isLast = ($idx === $totalItems - 1);
            $liFull = $dom->saveHTML($li);
            $liInner = '';
            foreach ($li->childNodes as $child) {
                $liInner .= $dom->saveHTML($child);
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

            $itemLines = 0;
            if (empty($segments)) {
                $itemLines = 1;
            } else {
                foreach ($segments as $seg) {
                    $itemLines += max(1, (int) ceil(mb_strlen($seg) / $listCharsPerLine));
                }
            }

            $itemHeight = $itemLines * $fontLineHeight + ($isLast ? 0.0 : $itemSpacing);
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

    public static function parseColumnPercentages(string $tableHtml, int $colCount): array
    {
        $colWidths = [];
        if (preg_match('/<colgroup[^>]*>(.*?)<\/colgroup>/is', $tableHtml, $colgroupMatch)) {
            $colgroupHtml = $colgroupMatch[1];
            if (preg_match_all('/<col[^>]*>/i', $colgroupHtml, $colMatches)) {
                foreach ($colMatches[0] as $colHtml) {
                    $width = null;
                    if (preg_match('/style=["\'][^"\']*width:\s*([\d.]+)(px|%)?[^"\']*["\']/i', $colHtml, $styleWidthMatch)) {
                        $width = (float) $styleWidthMatch[1];
                    } else if (preg_match('/width=["\']([\d.]+)%?["\']/i', $colHtml, $widthAttrMatch)) {
                        $width = (float) $widthAttrMatch[1];
                    }
                    $colWidths[] = $width;
                }
            }
        }

        while (count($colWidths) < $colCount) {
            $colWidths[] = null;
        }
        $finalColWidths = array_slice($colWidths, 0, $colCount);

        $hasExplicitWidth = false;
        foreach ($finalColWidths as $w) {
            if ($w !== null && $w > 0) {
                $hasExplicitWidth = true;
                break;
            }
        }

        if (! $hasExplicitWidth) {
            return array_fill(0, $colCount, 100.0 / $colCount);
        }

        $sum = 0.0;
        $explicitCount = 0;
        foreach ($finalColWidths as $w) {
            if ($w !== null && $w > 0) {
                $sum += $w;
                $explicitCount++;
            }
        }
        $avgWidth = $explicitCount > 0 ? ($sum / $explicitCount) : 0.0;
        $filledWidths = [];
        $totalWidth = 0.0;
        foreach ($finalColWidths as $w) {
            $val = ($w !== null && $w > 0) ? $w : $avgWidth;
            $filledWidths[] = $val;
            $totalWidth += $val;
        }

        $pcts = [];
        foreach ($filledWidths as $w) {
            $pcts[] = $totalWidth > 0 ? ($w / $totalWidth) * 100.0 : (100.0 / $colCount);
        }

        return $pcts;
    }

    public static function paginateTable(string $tableHtml, int $maxCharsPerLine = 155, float $fontLineHeight = 3.97): array
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

        $cellPaddingVertical = 2.64; // 1.06mm top + 1.06mm bottom + 0.52mm borders
        
        $colPcts = self::parseColumnPercentages($tableHtml, $colCount);

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
            $maxCellTextLen = 0;

            $cellIndex = 0;
            foreach ($cells as $cell) {
                $colSpan = 1;
                if ($cell->hasAttribute('colspan')) {
                    $colSpan = (int) $cell->getAttribute('colspan');
                }
                
                $colPct = 0.0;
                for ($c = 0; $c < $colSpan; $c++) {
                    $colPct += $colPcts[$cellIndex + $c] ?? 0.0;
                }
                if ($colPct <= 0.0) {
                    $colPct = 100.0 / max(1, $colCount);
                }
                
                $colWidthMm = (185.9 * $colPct) / 100.0;
                $usableCellWidthMm = max(10.0, $colWidthMm - 3.18);
                $dynamicCharsPerCell = max(8, (int) floor($usableCellWidthMm / 1.33));

                $cellInner = '';
                foreach ($cell->childNodes as $child) {
                    $cellInner .= $dom->saveHTML($child);
                }

                $decodedInner = html_entity_decode($cellInner, ENT_QUOTES, 'UTF-8');
                $decodedInner = str_replace("\xc2\xa0", ' ', $decodedInner);
                $decodedInner = str_replace("\xa0", ' ', $decodedInner);

                $isListCell = (bool) preg_match('/<(?:ul|ol|li)[^>]*>/i', $decodedInner) || (bool) preg_match('/[–-]\s{2,}/u', $decodedInner);
                $cellChars = $isListCell ? max(8, $dynamicCharsPerCell - 15) : $dynamicCharsPerCell;

                $rawSegments = preg_split('/<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>|<li[^>]*>|<\/li>/i', $cellInner);
                $segments = [];
                if ($rawSegments) {
                    foreach ($rawSegments as $s) {
                        $cleaned = html_entity_decode(trim(strip_tags($s)), ENT_QUOTES, 'UTF-8');
                        if (mb_strlen($cleaned) > 0) {
                            $segments[] = $cleaned;
                        }
                    }
                }

                $cellLines = 0;
                if (empty($segments)) {
                    $cellLines = 1;
                } else {
                    foreach ($segments as $seg) {
                        $maxCellTextLen = max($maxCellTextLen, mb_strlen($seg));
                        $cellLines += max(1, (int) ceil(mb_strlen($seg) / $cellChars));
                    }
                }

                $cellHeight = ($cellLines * $fontLineHeight) + $cellPaddingVertical;
                $maxCellHeight = max($maxCellHeight, $cellHeight);
                $cellIndex++;
            }

            if ($isHeader) {
                $headerHtml .= $trHtml;
                $headerHeight += $maxCellHeight;
            } else {
                $rows[] = [
                    'html' => $trHtml,
                    'height' => $maxCellHeight,
                    'maxCellTextLen' => $maxCellTextLen,
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

    public static function getMinNextBlockHeight(?array $nextBlock, float $lineHeight = 3.53): float
    {
        if (! $nextBlock) {
            return 0.0;
        }

        $type = $nextBlock['type'] ?? '';

        if ($type === 'paragraph') {
            $fontLineHeight = self::getBlockLineHeight($nextBlock, $lineHeight);

            return 2.0 * $fontLineHeight + 1.98; // Min 2 lines of text + paragraph spacing
        }

        if ($type === 'heading') {
            return (float) ($nextBlock['height'] ?? 7.94);
        }

        if ($type === 'image') {
            return (float) ($nextBlock['height'] ?? 30.0);
        }

        if ($type === 'image-grid') {
            return min(60.0, (float) ($nextBlock['height'] ?? 40.0));
        }

        if ($type === 'table') {
            return 18.0; // Table header + first row + padding
        }

        if ($type === 'list') {
            return 2.0 * $lineHeight + 1.98;
        }

        return (float) ($nextBlock['height'] ?? (2.0 * $lineHeight));
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

            $hasContentOnCurrentPage = $pageIndex > 0
                ? count($currentPage) > 0
                : count($currentPage) > 1 || (count($currentPage) === 1 && ($currentPage[0]['type'] ?? '') !== 'patient-card');

            if ($block['type'] === 'patient-card') {
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

            if ($block['type'] === 'section-header') {
                // Word-like keep_with_next constraint for section headers
                $nextBlock = $blocks[$bIndex + 1] ?? null;
                $minNextHeight = self::getMinNextBlockHeight($nextBlock, $lineHeight);

                if ($currentHeight + $block['height'] + $minNextHeight > $maxHeightForPage && $hasContentOnCurrentPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                }

                $currentPage[] = $block;
                $currentHeight += $block['height'];

                continue;
            }

            if ($block['type'] === 'heading') {
                $headingCost = $block['height'];
                $nextBlock = $blocks[$bIndex + 1] ?? null;
                $minNextHeight = self::getMinNextBlockHeight($nextBlock, $lineHeight);

                if ($currentHeight + $headingCost + $minNextHeight > $maxHeightForPage && $hasContentOnCurrentPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                }

                $currentPage[] = $block;
                $currentHeight += $headingCost;

                continue;
            }

            if ($block['type'] === 'image') {
                if ($currentHeight + $block['height'] > $maxHeightForPage && $hasContentOnCurrentPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                }

                $currentPage[] = $block;
                $currentHeight += $block['height'];

                continue;
            }

            if ($block['type'] === 'cuttings-summary' || $block['type'] === 'new-cuttings-summary') {
                if ($currentHeight + $block['height'] > $maxHeightForPage && $hasContentOnCurrentPage) {
                    $pages[] = $currentPage;
                    $currentPage = [];
                    $currentHeight = 0.0;
                    $pageIndex++;
                }

                $currentPage[] = $block;
                $currentHeight += $block['height'];

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
                    $remaining = $maxHeightForPage - $currentHeight;
                    $totalRows = count($rowHeights);
                    $currentIndex = $totalRows - count($rowsRemaining);

                    $minGridHeight = $rowHeights[$currentIndex] + $rowCaptionHeights[$currentIndex] + 2.0;

                    $canBreakToNextPage = $pageIndex > 0
                        ? count($currentPage) > 0
                        : count($currentPage) > 1 || (count($currentPage) === 1 && ($currentPage[0]['type'] ?? '') !== 'patient-card');

                    if ($remaining < $minGridHeight && $canBreakToNextPage) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

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
                        if ($canBreakToNextPage) {
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentHeight = 0.0;
                            $pageIndex++;

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
                        'type' => 'html',
                        'html' => $sliceHtml,
                        'height' => $cost,
                    ];

                    $currentHeight += $cost;
                    $rowsRemaining = array_slice($rowsRemaining, $r);
                }

                continue;
            }

            if ($block['type'] === 'paragraph') {
                $paraInnerHtml = self::getInnerHtml($block['html'], $block['tag']);
                $fontLh = self::getBlockLineHeight($block, $lineHeight);
                $fontSize = $fontLh / 1.25;
                $baseFontSize = 2.82;
                $dynamicMaxChars = (int) floor($maxCharsPerLine * ($baseFontSize / $fontSize));
                $lines = self::splitHtmlIntoLines($paraInnerHtml, $dynamicMaxChars);
                if (empty($lines)) {
                    $lines = ['<br>'];
                }

                $i = 0;
                $totalLines = count($lines);
                while ($i < $totalLines) {
                    $fontLineHeight = self::getBlockLineHeight($block, $lineHeight);
                    $remaining = $maxHeightForPage - $currentHeight;
                    $remainingLines = $totalLines - $i;

                    $canBreakToNextPage = $pageIndex > 0
                        ? count($currentPage) > 0
                        : count($currentPage) > 1 || (count($currentPage) === 1 && ($currentPage[0]['type'] ?? '') !== 'patient-card');

                    if ($remaining < $fontLineHeight && $canBreakToNextPage) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    $maxLinesFit = (int) floor($remaining / $fontLineHeight);

                    if ($maxLinesFit >= $remainingLines) {
                        $linesToFit = $remainingLines;
                    } else {
                        // Widow/orphan protection removed to maximize page space usage
                        $linesToFit = max(1, $maxLinesFit);
                    }

                    if ($linesToFit <= 0) {
                        if ($canBreakToNextPage) {
                            $pages[] = $currentPage;
                            $currentPage = [];
                            $currentHeight = 0.0;
                            $pageIndex++;

                            continue;
                        } else {
                            $linesToFit = 1;
                        }
                    }

                    $slice = array_slice($lines, $i, $linesToFit);

                    // Is this the last slice of the paragraph?
                    $isLastSlice = ($i + $linesToFit >= $totalLines);
                    $classAttr = ! empty($block['class']) ? $block['class'] : 'section-content';
                    $attrs = self::getRootElementAttributes($block['html']);
                    $originalStyle = $attrs['style'];
                    $extraAttrs = $attrs['extraAttrs'];
                    $mergedStyle = $originalStyle;
                    if (! $isLastSlice) {
                        $mergedStyle = ! empty($mergedStyle)
                            ? (str_ends_with(trim($mergedStyle), ';') ? trim($mergedStyle) : trim($mergedStyle).';').' margin-bottom: 0px;'
                            : 'margin-bottom: 0px;';
                    }
                    $styleAttrStr = ! empty($mergedStyle) ? " style=\"{$mergedStyle}\"" : '';
                    $sliceHtml = "<{$block['tag']} class=\"{$classAttr}\"{$styleAttrStr}{$extraAttrs}>".implode('', $slice)."</{$block['tag']}>";
                    $blockCost = ($linesToFit * $fontLineHeight) + ($isLastSlice ? 1.98 : 0.0);

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
                $fontLineHeight = self::getBlockLineHeight($block, $lineHeight);
                $fontSize = $fontLineHeight / 1.25;
                $baseFontSize = 2.82;
                $dynamicMaxChars = (int) floor($maxCharsPerLine * ($baseFontSize / $fontSize));
                $listData = self::paginateList($block['html'], $dynamicMaxChars, $fontLineHeight);
                $listItems = $listData['items'];
                $tag = $listData['tag'];

                $i = 0;
                $olStartIndex = 1;
                while ($i < count($listItems)) {
                    $remaining = $maxHeightForPage - $currentHeight;
                    $canBreakToNextPage = $pageIndex > 0
                        ? count($currentPage) > 0
                        : count($currentPage) > 1 || (count($currentPage) === 1 && ($currentPage[0]['type'] ?? '') !== 'patient-card');

                    if ($remaining <= 1.0 * $fontLineHeight && $canBreakToNextPage) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    $item = $listItems[$i];
                    $itemHtml = $item['html'];
                    $itemHeight = $item['height'];

                    if ($itemHeight > $remaining) {
                        if (! $canBreakToNextPage) {
                            $startAttr = ($tag === 'ol' && $olStartIndex > 1) ? " start=\"{$olStartIndex}\"" : '';
                            $listStyleAttr = ! empty($listData['listStyleType']) ? " data-list-style-type=\"{$listData['listStyleType']}\"" : '';

                            $isLastOfAll = $i + 1 >= count($listItems);
                            $mergedStyle = $listData['styleAttr'] ?? '';
                            if (! $isLastOfAll) {
                                $mergedStyle = ! empty($mergedStyle)
                                    ? (str_ends_with(trim($mergedStyle), ';') ? trim($mergedStyle) : trim($mergedStyle).';').' margin-bottom: 0px !important;'
                                    : 'margin-bottom: 0px !important;';
                            }
                            $styleAttr = ! empty($mergedStyle) ? " style=\"{$mergedStyle}\"" : '';
                            $currentPage[] = [
                                'type' => 'html',
                                'html' => "<{$tag} class=\"section-content\"{$startAttr}{$listStyleAttr}{$styleAttr}>".$itemHtml."</{$tag}>",
                                'height' => $itemHeight + 1.98,
                            ];
                            $currentHeight += $itemHeight + 1.98;
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
                            $nextItem = $listItems[$i];
                            $nextItemHtml = $nextItem['html'];
                            $nextItemHeight = $nextItem['height'];

                            $isLastOfAll = ($i === count($listItems) - 1);
                            $spacingOverhead = $isLastOfAll ? 1.98 : 0.0;

                            if ($accumulatedHeight + $nextItemHeight + $spacingOverhead > $remaining) {
                                break;
                            }

                            $itemsToFit[] = $nextItemHtml;
                            $accumulatedHeight += $nextItemHeight;
                            $i++;
                        }

                        if (count($itemsToFit) > 0) {
                            $isLastOfAll = ($i >= count($listItems));
                            $cost = $accumulatedHeight + ($isLastOfAll ? 1.98 : 0.0);

                            $startAttr = ($tag === 'ol' && $olStartIndex > 1) ? " start=\"{$olStartIndex}\"" : '';
                            $listStyleAttr = ! empty($listData['listStyleType']) ? " data-list-style-type=\"{$listData['listStyleType']}\"" : '';

                            $isLastOfAll = ($i >= count($listItems));
                            $mergedStyle = $listData['styleAttr'] ?? '';
                            if (! $isLastOfAll) {
                                $mergedStyle = ! empty($mergedStyle)
                                    ? (str_ends_with(trim($mergedStyle), ';') ? trim($mergedStyle) : trim($mergedStyle).';').' margin-bottom: 0px !important;'
                                    : 'margin-bottom: 0px !important;';
                            }
                            $styleAttr = ! empty($mergedStyle) ? " style=\"{$mergedStyle}\"" : '';
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
                $fontLineHeight = 3.97;
                $fontSize = $fontLineHeight / 1.25;
                $baseFontSize = 2.82;
                $dynamicMaxChars = (int) floor($maxCharsPerLine * ($baseFontSize / $fontSize));
                $tableData = self::paginateTable($block['html'], $dynamicMaxChars, $fontLineHeight);
                $headerHtml = $tableData['headerHtml'];
                $headerHeight = $tableData['headerHeight'];
                $rows = $tableData['rows'];

                $i = 0;
                while ($i < count($rows)) {
                    $remaining = $maxHeightForPage - $currentHeight;
                    $canBreakToNextPage = $pageIndex > 0
                        ? count($currentPage) > 0
                        : count($currentPage) > 1 || (count($currentPage) === 1 && ($currentPage[0]['type'] ?? '') !== 'patient-card');

                    $minNeededForFirstRow = $headerHeight + ($rows[$i]['height'] ?? 6.0) + ($i === 0 && $currentHeight > 0.0 ? 1.32 : 0.0);
                    if ($remaining < $minNeededForFirstRow && $canBreakToNextPage) {
                        $pages[] = $currentPage;
                        $currentPage = [];
                        $currentHeight = 0.0;
                        $pageIndex++;

                        continue;
                    }

                    $tableTopMargin = ($i === 0 && $currentHeight > 0.0) ? 1.32 : 0.0;
                    $remainingForRows = $remaining - $headerHeight - $tableTopMargin;

                    $rowsToFit = [];
                    $accumulatedHeight = 0.0;

                    while ($i < count($rows)) {
                        $row = $rows[$i];
                        $rowHeight = $row['height'];

                        $isLastRow = ($i === count($rows) - 1);
                        $tableBottomMargin = $isLastRow ? 2.65 : 0.0;
                        $splitBuffer = ! $isLastRow ? 2.0 : 0.0;

                        if ($accumulatedHeight + $rowHeight + $tableBottomMargin + $splitBuffer > $remainingForRows) {
                            if (count($rowsToFit) === 0 && ! $canBreakToNextPage) {
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
                        $cost = $accumulatedHeight + $headerHeight + $tableTopMargin + ($isLastRow ? 2.65 : 0.0);

                        $tableClass = 'section-content';
                        if (preg_match('/<table[^>]+class=["\']([^"\']+)["\']/i', $block['html'], $classMatch)) {
                            $tableClass = $classMatch[1];
                        }

                        $tableStyle = '';
                        if (preg_match('/<table[^>]+style=["\']([^"\']+)["\']/i', $block['html'], $styleMatch)) {
                            $tableStyle = $styleMatch[1];
                        }

                        $colgroupHtml = '';
                        if (preg_match('/<colgroup[^>]*>.*?<\/colgroup>/is', $block['html'], $colgroupMatch)) {
                            $colgroupHtml = $colgroupMatch[0];
                        }

                        $mergedStyle = $tableStyle;
                        if (! $isLastRow) {
                            $mergedStyle = ! empty($mergedStyle)
                                ? (str_ends_with(trim($mergedStyle), ';') ? trim($mergedStyle) : trim($mergedStyle).';').' margin-bottom: 0px !important;'
                                : 'margin-bottom: 0px !important;';
                        }
                        $styleAttr = ! empty($mergedStyle) ? " style=\"{$mergedStyle}\"" : '';
                        $tableWrapperHtml = "<table class=\"{$tableClass}\"{$styleAttr}>";
                        if (! empty($colgroupHtml)) {
                            $tableWrapperHtml .= $colgroupHtml;
                        }
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
