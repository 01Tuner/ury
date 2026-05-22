import qz from 'qz-tray';
import axios from 'axios';
import { privateKey } from '../../privateKey';
import { KEYUTIL, KJUR, stob64, hextorstr } from 'jsrsasign';

function setupQzSecurity(): void {
  qz.security.setCertificatePromise((resolve: (data: string) => void, reject: (err?: string) => void) => {
    axios.get('/assets/ury/files/cert.pem')
      .then(({ data }) => resolve(data))
      .catch((err) => reject('Error fetching certificate: ' + String(err)));
  });

  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((toSign: string) => (resolve: (sig: string) => void, reject: (err?: string) => void) => {
    try {
      // @ts-expect-error: privateKey must be provided securely
      const pk = KEYUTIL.getKey(privateKey);
      const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
      sig.init(pk);
      sig.updateString(toSign);
      const hex = sig.sign();
      resolve(stob64(hextorstr(hex)));
    } catch (err) {
      reject(String(err));
    }
  });
}

export async function loadQzPrinter(host: string): Promise<void> {
  setupQzSecurity();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ host, usingSecure: false });
  }
}

export function disconnectQzPrinter(): void {
  if (qz.websocket.isActive()) qz.websocket.disconnect();
}

export async function listQzPrinters(host: string): Promise<string[]> {
  setupQzSecurity();
  if (!qz.websocket.isActive()) {
    await loadQzPrinter(host);
  }
  try {
    const printers = await qz.printers.find();
    if (Array.isArray(printers) && printers.length > 0) {
      return printers as string[];
    }
  } catch {
    // fall through to default
  }
  const defaultPrinter = await qz.printers.getDefault();
  return defaultPrinter ? [defaultPrinter as string] : [];
}

export async function printWithQz(
  host: string,
  htmlToPrint: string,
  printerName?: string
): Promise<void> {
  setupQzSecurity();

  const printing = async () => {
    const printer =
      printerName && printerName.length > 0
        ? printerName
        : await qz.printers.getDefault();
    const data = [{ type: 'html', format: 'plain', data: htmlToPrint }];
    const config = qz.configs.create(printer);
    await qz.print(config, data as Parameters<typeof qz.print>[1]);
  };

  if (qz.websocket.isActive()) {
    await printing();
  } else {
    await loadQzPrinter(host);
    await printing();
  }
}
