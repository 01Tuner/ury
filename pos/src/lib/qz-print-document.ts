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

export interface QzPageDimensions {
  pageWidth?: number;
  pageHeight?: number;
}

const MM_PER_INCH = 25.4;

function mmToInches(mm: number): number {
  return Math.round((mm / MM_PER_INCH) * 100) / 100;
}

function parseBodyWidthMm(style: string): number | undefined {
  const bodyBlocks = [...style.matchAll(/body\s*\{([^}]*)\}/gis)];
  for (const match of bodyBlocks) {
    const rules = match[1];
    const maxWidth = rules.match(/max-width:\s*(\d+(?:\.\d+)?)\s*mm/i);
    if (maxWidth) return parseFloat(maxWidth[1]);
  }
  for (const match of bodyBlocks) {
    const rules = match[1];
    const minWidth = rules.match(/min-width:\s*(\d+(?:\.\d+)?)\s*mm/i);
    if (minWidth) return parseFloat(minWidth[1]);
  }
  return undefined;
}

function parsePageSizeMm(style: string): { width?: number; height?: number } {
  const pageBlocks = [...style.matchAll(/@page\s*\{([^}]*)\}/gis)];
  for (const match of pageBlocks) {
    const rules = match[1];
    const sizeMatch = rules.match(
      /size:\s*(\d+(?:\.\d+)?)\s*mm(?:\s+(\d+(?:\.\d+)?)\s*mm|\s+auto)?/i
    );
    if (sizeMatch) {
      return {
        width: parseFloat(sizeMatch[1]),
        height: sizeMatch[2] ? parseFloat(sizeMatch[2]) : undefined,
      };
    }
  }
  return {};
}

/**
 * Extracts page dimensions from Print Format CSS for QZ Tray HTML rendering.
 * QZ ignores @page rules; pass the result as options.pageWidth (inches).
 */
export function parsePageDimensionsFromStyle(style: string): QzPageDimensions {
  const bodyWidthMm = parseBodyWidthMm(style);
  const pageSize = parsePageSizeMm(style);
  const widthMm = bodyWidthMm ?? pageSize.width;

  const result: QzPageDimensions = {};
  if (widthMm) {
    result.pageWidth = mmToInches(widthMm);
  }
  if (pageSize.height) {
    result.pageHeight = mmToInches(pageSize.height);
  }
  return result;
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
