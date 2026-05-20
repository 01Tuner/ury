import { printWithQz } from './print-qz';
import {
  getInvoicePrintHtml,
  getClosingEntryPrintHtml,
  networkPrint,
  selectNetworkPrinter,
  updatePrintStatus
} from './invoice-api';
import { PosProfileCombined } from './pos-profile-api';

interface PrintOrderParams {
  orderId: string;
  posProfile: PosProfileCombined
}

const DEFAULT_CLOSING_PRINT_FORMAT = 'Standard';

export async function printOrder({ orderId, posProfile }: PrintOrderParams): Promise<'qz' | 'network' | 'socket'> {
  const { print_type, qz_host, print_format, printer, name, cashier, multiple_cashier } = posProfile;

  if (print_type === 'qz') {
    if (!qz_host) {
      throw new Error('QZ host is not set');
    }
    const html = await getInvoicePrintHtml(orderId, print_format as string);
    await printWithQz(qz_host, html);
    await updatePrintStatus(orderId);
    return 'qz';
  } else if (print_type === 'network') {
    if (cashier && !multiple_cashier) {
      await networkPrint(orderId, printer as string, print_format as string);
    } else {
      await selectNetworkPrinter(orderId, name, print_format);
    }
    await updatePrintStatus(orderId);
    return 'network';
  } else {
    const url = `/printview?doctype=POS Invoice&name=${orderId}&format=${print_format}&no_letterhead=1&settings={}&letterhead=No Letterhead&trigger_print=1&_lang=en`;
    window.open(url, '_blank', 'noopener,noreferrer');
    await updatePrintStatus(orderId);
    return 'socket';
  }
}

interface PrintClosingEntryParams {
  entryName: string;
  posProfile: PosProfileCombined;
  printFormat?: string;
}

export async function printClosingEntry({
  entryName,
  posProfile,
  printFormat = DEFAULT_CLOSING_PRINT_FORMAT,
}: PrintClosingEntryParams): Promise<'qz' | 'network' | 'socket'> {
  const { print_type, qz_host, printer, name, cashier, multiple_cashier } = posProfile;

  if (print_type === 'qz') {
    if (!qz_host) {
      throw new Error('QZ host is not set');
    }
    const html = await getClosingEntryPrintHtml(entryName, printFormat);
    await printWithQz(qz_host, html);
    return 'qz';
  }

  if (print_type === 'network') {
    await networkPrint(entryName, printer as string, printFormat, 'POS Closing Entry');
    return 'network';
  }

  const url = `/printview?doctype=POS Closing Entry&name=${entryName}&format=${printFormat}&no_letterhead=1&settings={}&letterhead=No Letterhead&trigger_print=1&_lang=en`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return 'socket';
}
