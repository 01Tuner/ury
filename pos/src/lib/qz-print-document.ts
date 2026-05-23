export interface PrintHtmlAndStyle {
  html: string;
  style: string;
}

export interface BuildQzPrintDocumentOptions {
  html: string;
  style: string;
  lang?: string;
  rtl?: boolean;
}

const printBundleCssCache = new Map<string, string | null>();

async function resolvePrintBundleCssUrl(rtl: boolean): Promise<string | null> {
  const cacheKey = rtl ? 'rtl' : 'ltr';
  if (printBundleCssCache.has(cacheKey)) {
    return printBundleCssCache.get(cacheKey) ?? null;
  }

  const assetKey = rtl ? 'rtl_print.bundle.css' : 'print.bundle.css';
  const assetsPath = rtl ? '/assets/assets-rtl.json' : '/assets/assets.json';

  try {
    const response = await fetch(assetsPath, { credentials: 'include' });
    if (!response.ok) {
      printBundleCssCache.set(cacheKey, null);
      return null;
    }
    const assets = (await response.json()) as Record<string, string>;
    const path = assets[assetKey];
    if (!path) {
      printBundleCssCache.set(cacheKey, null);
      return null;
    }
    const url = `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
    printBundleCssCache.set(cacheKey, url);
    return url;
  } catch {
    printBundleCssCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Builds a self-contained HTML document for QZ Tray pixel HTML printing,
 * mirroring frappe/www/printview.html (print.bundle.css + print_style + body).
 */
export async function buildQzPrintDocument({
  html,
  style,
  lang = 'en',
  rtl = false,
}: BuildQzPrintDocumentOptions): Promise<string> {
  const printBundleUrl = await resolvePrintBundleCssUrl(rtl);
  const dir = rtl ? 'rtl' : 'ltr';
  const linkTag = printBundleUrl
    ? `<link rel="stylesheet" href="${printBundleUrl}">`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${linkTag}
  <style>${style}</style>
</head>
<body>
  <div class="print-format-gutter">
    <div class="print-format">${html}</div>
  </div>
</body>
</html>`;
}
