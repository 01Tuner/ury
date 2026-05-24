import { printWithQz } from './print-qz';
import {
  networkPrint,
  selectNetworkPrinter,
  updatePrintStatus
} from './invoice-api';
import { buildPrintViewUrl, fetchPrintHtml } from './print-view-url';
import { PosProfileCombined } from './pos-profile-api';
import { getBillPrinter } from './qz-printer-mapping';
import { showToast } from '../components/ui/toast';
import { getActiveLanguage, t } from '../i18n';

interface PrintOrderParams {
  orderId: string;
  posProfile: PosProfileCombined
}

export async function printOrder({ orderId, posProfile }: PrintOrderParams): Promise<'qz' | 'network' | 'socket'> {
  const { print_type, qz_host, print_format, printer, name, cashier, multiple_cashier } = posProfile;

  if (print_type === 'qz') {
    if (!qz_host) {
      throw new Error('QZ host is not set');
    }
    const printHtml = await fetchPrintHtml({
      doctype: 'POS Invoice',
      name: orderId,
      printFormat: print_format as string,
      lang: getActiveLanguage(),
    });
    const billPrinter = getBillPrinter(name);
    if (!billPrinter) {
      showToast.info(t('printer_mapping.bill_printer_fallback'));
    }
    await printWithQz(qz_host, printHtml, billPrinter ?? undefined);
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
    const url = buildPrintViewUrl({
      doctype: 'POS Invoice',
      name: orderId,
      printFormat: print_format as string,
      lang: getActiveLanguage(),
      triggerPrint: true,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    await updatePrintStatus(orderId);
    return 'socket';
  }
}

interface PrintClosingEntryParams {
  entryName: string;
  posProfile: PosProfileCombined;
}

/** ERPNext Standard print format; layout handled server-side. */
const CLOSING_PRINT_FORMAT = '';

export async function printClosingEntry({
  entryName,
  posProfile,
}: PrintClosingEntryParams): Promise<'qz' | 'network' | 'socket'> {
  const { print_type, printer } = posProfile;

  if (print_type === 'network') {
    await networkPrint(
      entryName,
      printer as string,
      CLOSING_PRINT_FORMAT,
      'POS Closing Entry'
    );
    return 'network';
  }

  const url = buildPrintViewUrl({
    doctype: 'POS Closing Entry',
    name: entryName,
    printFormat: CLOSING_PRINT_FORMAT,
    lang: getActiveLanguage(),
    triggerPrint: true,
  });
  window.open(url, '_blank', 'noopener,noreferrer');
  return print_type === 'qz' ? 'qz' : 'socket';
}
