export interface QzPrinterMapping {
  billPrinter: string | null;
  productionPrinters: Record<string, string>;
}

export const QZ_PRINTER_MAP_PREFIX = 'ury_qz_printer_map_';

function storageKey(posProfileName: string): string {
  return `${QZ_PRINTER_MAP_PREFIX}${posProfileName}`;
}

export function snapshotQzPrinterMappings(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(QZ_PRINTER_MAP_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }
  }
  return snapshot;
}

export function restoreQzPrinterMappings(snapshot: Record<string, string>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    localStorage.setItem(key, value);
  }
}

export function loadQzPrinterMapping(posProfileName: string): QzPrinterMapping {
  try {
    const raw = localStorage.getItem(storageKey(posProfileName));
    if (!raw) {
      return { billPrinter: null, productionPrinters: {} };
    }
    const parsed = JSON.parse(raw) as Partial<QzPrinterMapping>;
    return {
      billPrinter: parsed.billPrinter ?? null,
      productionPrinters: parsed.productionPrinters ?? {},
    };
  } catch {
    return { billPrinter: null, productionPrinters: {} };
  }
}

export function saveQzPrinterMapping(
  posProfileName: string,
  mapping: QzPrinterMapping
): void {
  localStorage.setItem(storageKey(posProfileName), JSON.stringify(mapping));
}

export function getBillPrinter(posProfileName: string): string | null {
  return loadQzPrinterMapping(posProfileName).billPrinter;
}

export function getProductionPrinter(
  posProfileName: string,
  productionUnitName: string
): string | null {
  const mapping = loadQzPrinterMapping(posProfileName);
  return mapping.productionPrinters[productionUnitName] ?? null;
}
