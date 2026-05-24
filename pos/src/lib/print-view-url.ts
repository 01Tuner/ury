export interface BuildPrintViewUrlParams {
  doctype: string;
  name: string;
  printFormat: string;
  lang?: string;
  triggerPrint?: boolean;
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
