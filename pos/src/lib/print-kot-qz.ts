import { printWithQz } from './print-qz';
import { fetchPrintHtml } from './print-view-url';
import { getProductionPrinter } from './qz-printer-mapping';
import { getActiveLanguage } from '../i18n';

export interface CreatedKot {
  name: string;
  production: string;
}

export async function printKotsWithQz({
  host,
  kots,
  posProfileName,
  kotPrintFormat,
}: {
  host: string;
  kots: CreatedKot[];
  posProfileName: string;
  kotPrintFormat: string;
}): Promise<{ printed: number; skipped: number }> {
  let printed = 0;
  let skipped = 0;

  for (const kot of kots) {
    const printer = getProductionPrinter(posProfileName, kot.production);
    if (!printer) {
      skipped += 1;
      continue;
    }

    const printHtml = await fetchPrintHtml({
      doctype: 'URY KOT',
      name: kot.name,
      printFormat: kotPrintFormat,
      lang: getActiveLanguage(),
    });
    await printWithQz(host, printHtml, printer);
    printed += 1;
  }

  return { printed, skipped };
}
