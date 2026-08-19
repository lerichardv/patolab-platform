export function getImageHeight(blockHtml: string): number {
    const wAttrMatch = blockHtml.match(/<img[^>]+width=["'](\d+)["']/i);
    const swMatch = blockHtml.match(/width:\s*(\d+)px/i);
    let attrWidth = wAttrMatch
        ? parseInt(wAttrMatch[1], 10)
        : swMatch
          ? parseInt(swMatch[1], 10)
          : null;

    const hAttrMatch = blockHtml.match(/<img[^>]+height=["'](\d+)["']/i);
    const shMatch = blockHtml.match(/height:\s*(\d+)px/i);
    let attrHeight = hAttrMatch
        ? parseInt(hAttrMatch[1], 10)
        : shMatch
          ? parseInt(shMatch[1], 10)
          : null;

    if ((!attrWidth || !attrHeight) && typeof document !== 'undefined') {
        const srcMatch = blockHtml.match(/src=["']([^"']+)["']/i);

        if (srcMatch && srcMatch[1]) {
            const src = srcMatch[1];
            const imgs = document.getElementsByTagName('img');

            for (let i = 0; i < imgs.length; i++) {
                const imgEl = imgs[i];

                if (imgEl.src === src || imgEl.getAttribute('src') === src) {
                    if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                        if (!attrWidth && !attrHeight) {
                            attrWidth = imgEl.naturalWidth;
                            attrHeight = imgEl.naturalHeight;
                        } else if (attrWidth && !attrHeight) {
                            attrHeight = Math.round(
                                attrWidth *
                                    (imgEl.naturalHeight / imgEl.naturalWidth),
                            );
                        } else if (!attrWidth && attrHeight) {
                            attrWidth = Math.round(
                                attrHeight *
                                    (imgEl.naturalWidth / imgEl.naturalHeight),
                            );
                        }
                    }

                    break;
                }
            }
        }
    }

    const width = attrWidth ?? 704;
    let height = attrHeight;

    if (!height) {
        height = width; // 1:1 default fallback
    }

    if (width > 704) {
        height = Math.round(height * (704 / width));
    }

    const heightMm = (height * 25.4) / 96;

    return heightMm + 1.0;
}

export function getImageAspectRatio(imgTag: string): number {
    const wAttrMatch = imgTag.match(/width=["'](\d+)["']/i);
    const swMatch = imgTag.match(/width:\s*(\d+)px/i);
    const attrWidth = wAttrMatch
        ? parseInt(wAttrMatch[1], 10)
        : swMatch
          ? parseInt(swMatch[1], 10)
          : null;

    const hAttrMatch = imgTag.match(/height=["'](\d+)["']/i);
    const shMatch = imgTag.match(/height:\s*(\d+)px/i);
    const attrHeight = hAttrMatch
        ? parseInt(hAttrMatch[1], 10)
        : shMatch
          ? parseInt(shMatch[1], 10)
          : null;

    if (attrHeight && attrWidth && attrWidth > 0) {
        return attrHeight / attrWidth;
    }

    if (typeof document !== 'undefined') {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);

        if (srcMatch && srcMatch[1]) {
            const src = srcMatch[1];
            const imgs = document.getElementsByTagName('img');

            for (let i = 0; i < imgs.length; i++) {
                const imgEl = imgs[i];

                if (imgEl.src === src || imgEl.getAttribute('src') === src) {
                    if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                        return imgEl.naturalHeight / imgEl.naturalWidth;
                    }

                    break;
                }
            }
        }
    }

    return 1.0;
}
