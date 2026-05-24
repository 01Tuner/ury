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

/** Fetch rendered print HTML via authenticated API (required for QZ Tray). */
export async function fetchPrintHtml({
  doctype,
  name,
  printFormat,
  lang = 'en',
}: FetchPrintHtmlParams): Promise<string> {
  const printUrl = buildPrintViewUrl({ doctype, name, printFormat, lang });
  console.log('[QZ print] print URL:', printUrl);

  const result = await call.get('frappe.www.printview.get_html_and_style', {
    doc: doctype,
    name,
    print_format: printFormat || '',
    no_letterhead: 1,
    letterhead: 'No Letterhead',
    settings: '{}',
    _lang: lang,
  });

  const html = (result as { message?: { html?: string } }).message?.html;
  if (!html) {
    throw new Error('Failed to fetch print HTML');
  }
  return html;
}
