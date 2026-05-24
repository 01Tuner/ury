import axios from 'axios';
import { call } from './frappe-sdk';

export interface BuildPrintViewUrlParams {
  doctype: string;
  name: string;
  printFormat: string;
  lang?: string;
  triggerPrint?: boolean;
}

export interface FetchPrintHtmlParams {
  doctype: string;
  name: string;
  printFormat: string;
  lang?: string;
}

export function buildPrintViewUrl({
  doctype,
  name,
  printFormat,
  lang = 'en',
  triggerPrint = false,
}: BuildPrintViewUrlParams): string {
  const params = new URLSearchParams({
    doctype,
    name,
    format: printFormat,
    no_letterhead: '1',
    letterhead: 'No Letterhead',
    settings: '{}',
    trigger_print: triggerPrint ? '1' : '0',
    _lang: lang,
  });
  return `${window.location.origin}/printview?${params.toString()}`;
}

let cachedPrintBundleCss: string | null = null;

async function getPrintBundleCss(): Promise<string> {
  if (cachedPrintBundleCss !== null) {
    return cachedPrintBundleCss;
  }

  try {
    const { data: assets } = await axios.get<Record<string, string>>('/assets/assets.json');
    const bundlePath = assets['print.bundle.css'];
    if (!bundlePath) {
      cachedPrintBundleCss = '';
      return cachedPrintBundleCss;
    }

    const { data: css } = await axios.get<string>(bundlePath, { responseType: 'text' });
    cachedPrintBundleCss = typeof css === 'string' ? css : '';
  } catch {
    cachedPrintBundleCss = '';
  }

  return cachedPrintBundleCss;
}

function wrapPrintDocument(html: string, style: string, lang: string, bundleCss: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<style type="text/css">
${style}
</style>
</head>
<body>
 ${html}
</div>
</body>
</html>`;
}

/** Fetch rendered print HTML via authenticated API (required for QZ Tray). */
export async function fetchPrintHtml({
  doctype,
  name,
  printFormat,
  lang = 'en',
}: FetchPrintHtmlParams): Promise<string> {
  const printUrl = buildPrintViewUrl({ doctype, name, printFormat, lang });
  console.log('[QZ print] print URL:', printUrl);

  const [result, bundleCss] = await Promise.all([
    call.get('frappe.www.printview.get_html_and_style', {
      doc: doctype,
      name,
      print_format: printFormat || '',
      no_letterhead: 1,
      letterhead: 'No Letterhead',
      settings: '{}',
      _lang: lang,
    }),
    getPrintBundleCss(),
  ]);

  const message = (result as { message?: { html?: string; style?: string } }).message;
  const html = message?.html;
  const style = message?.style ?? '';
  if (!html) {
    throw new Error('Failed to fetch print HTML');
  }
  return wrapPrintDocument(html, style, lang, bundleCss);
}
