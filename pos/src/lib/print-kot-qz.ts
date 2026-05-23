import { getKotPrintHtml } from './invoice-api';
import { printWithQz } from './print-qz';
import { buildQzPrintDocument, parsePageDimensionsFromStyle } from './qz-print-document';
import { getProductionPrinter } from './qz-printer-mapping';
import { getActiveDirection, getActiveLanguage } from '../i18n';

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

    const { html, style } = await getKotPrintHtml(kot.name, kotPrintFormat);
    const pageDims = parsePageDimensionsFromStyle(style);
    const documentHtml = await buildQzPrintDocument({
      html,
      style,
      lang: getActiveLanguage(),
      rtl: getActiveDirection() === 'rtl',
    });
    await printWithQz(host, documentHtml, printer, pageDims);
    printed += 1;
  }

  return { printed, skipped };
}
