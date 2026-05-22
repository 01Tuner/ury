import { getKotPrintHtml } from './invoice-api';
import { printWithQz } from './print-qz';
import { getProductionPrinter } from './qz-printer-mapping';

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

    const html = await getKotPrintHtml(kot.name, kotPrintFormat);
    await printWithQz(host, html, printer);
    printed += 1;
  }

  return { printed, skipped };
}
