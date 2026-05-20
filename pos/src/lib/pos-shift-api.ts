import { call, db } from './frappe-sdk';

export interface ModeOfPaymentBalance {
  mode_of_payment: string;
  opening_amount: number;
  closing_amount?: number;
  expected_amount?: number;
  difference?: number;
}

export interface POSOpeningEntryListItem {
  name: string;
  status: string;
  branch?: string;
  posting_date?: string;
  period_start_date?: string;
  pos_profile?: string;
}

export interface POSOpeningEntryDoc {
  name: string;
  period_start_date: string;
  posting_date: string;
  company: string;
  pos_profile: string;
  branch: string;
  user: string;
  owner: string;
  balance_details: ModeOfPaymentBalance[];
}

export interface POSInvoiceForClosing {
  name: string;
  grand_total: number;
  net_total: number;
  total_qty: number;
  modified: string;
  payments: Array<{ mode_of_payment: string; amount: number }>;
  taxes: Array<{ account_head: string; rate: number; tax_amount: number }>;
}

export interface ClosingTotals {
  grandTotal: number;
  netTotal: number;
  totalQty: number;
  totalInvoices: number;
  payments: Array<{ mode_of_payment: string; expected_amount: number }>;
  posTransactions: Array<{ pos_invoice: string; date: string; amount: number }>;
}

export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export async function getModeOfPaymentBalances(): Promise<ModeOfPaymentBalance[]> {
  const response = await call.get<{ message: ModeOfPaymentBalance[] }>(
    'ury.ury_pos.api.getModeOfPayment'
  );
  return response.message.map((m) => ({
    ...m,
    opening_amount: Number(m.opening_amount) || 0,
  }));
}

export async function createPOSOpeningEntry(data: {
  period_start_date: string;
  posting_date: string;
  company: string;
  pos_profile: string;
  balance_details: ModeOfPaymentBalance[];
  branch: string;
  user: string;
}): Promise<{ name: string }> {
  return db.createDoc('POS Opening Entry', {
    ...data,
    docstatus: 0,
  });
}

export async function submitPOSOpeningEntry(name: string): Promise<void> {
  await db.updateDoc('POS Opening Entry', name, { docstatus: 1 });
}

export async function openAndSubmitPOSOpeningEntry(data: {
  period_start_date: string;
  posting_date: string;
  company: string;
  pos_profile: string;
  balance_details: ModeOfPaymentBalance[];
  branch: string;
  user: string;
}): Promise<{ name: string }> {
  const doc = await createPOSOpeningEntry(data);
  await submitPOSOpeningEntry(doc.name);
  return doc;
}

export async function getOpenPOSOpeningEntries(
  branch: string,
  posProfile?: string
): Promise<POSOpeningEntryListItem[]> {
  const filters: [string, string, string | number][] = [
    ['status', '=', 'Open'],
    ['docstatus', '=', 1],
    ['branch', '=', branch],
  ];
  if (posProfile) {
    filters.push(['pos_profile', '=', posProfile]);
  }
  return db.getDocList('POS Opening Entry', {
    fields: ['name', 'status', 'branch', 'posting_date', 'period_start_date', 'pos_profile'],
    filters,
    orderBy: { field: 'creation', order: 'desc' },
  });
}

export async function getPOSOpeningEntry(name: string): Promise<POSOpeningEntryDoc> {
  return db.getDoc('POS Opening Entry', name);
}

export async function getPosInvoicesForClosing(params: {
  start: string;
  end: string;
  pos_profile: string;
  user: string;
}): Promise<POSInvoiceForClosing[]> {
  const response = await call.get<{ message: POSInvoiceForClosing[] }>(
    'erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry.get_pos_invoices',
    params
  );
  return response.message;
}

export function aggregateClosingData(invoices: POSInvoiceForClosing[]): ClosingTotals {
  let grandTotal = 0;
  let netTotal = 0;
  let totalQty = 0;
  const paymentAggregated: Record<string, { mode_of_payment: string; expected_amount: number }> = {};

  for (const invoice of invoices) {
    grandTotal += parseFloat(String(invoice.grand_total)) || 0;
    netTotal += parseFloat(String(invoice.net_total)) || 0;
    totalQty += parseFloat(String(invoice.total_qty)) || 0;

    for (const payment of invoice.payments || []) {
      if (!paymentAggregated[payment.mode_of_payment]) {
        paymentAggregated[payment.mode_of_payment] = {
          mode_of_payment: payment.mode_of_payment,
          expected_amount: 0,
        };
      }
      paymentAggregated[payment.mode_of_payment].expected_amount +=
        parseFloat(String(payment.amount)) || 0;
    }
  }

  return {
    grandTotal,
    netTotal,
    totalQty,
    totalInvoices: invoices.length,
    payments: Object.values(paymentAggregated),
    posTransactions: invoices.map((item) => ({
      pos_invoice: item.name,
      date: item.modified.split(' ')[0],
      amount: parseFloat(String(item.grand_total)) || 0,
    })),
  };
}

export function buildPaymentReconciliation(
  openingBalance: ModeOfPaymentBalance[],
  payments: Array<{ mode_of_payment: string; expected_amount: number }>
): ModeOfPaymentBalance[] {
  return openingBalance.map((item) => {
    const matched = payments.find((p) => p.mode_of_payment === item.mode_of_payment);
    const expected = matched?.expected_amount ?? 0;
    const closing = item.closing_amount ?? expected;
    return {
      mode_of_payment: item.mode_of_payment,
      opening_amount: item.opening_amount,
      expected_amount: expected,
      closing_amount: closing,
      difference: closing - expected,
    };
  });
}

export async function createPOSClosingEntry(data: {
  period_start_date: string;
  period_end_date: string;
  posting_date: string;
  posting_time: string;
  company: string;
  pos_profile: string;
  payment_reconciliation: ModeOfPaymentBalance[];
  pos_transactions: Array<{ pos_invoice: string; date: string; amount: number }>;
  pos_opening_entry: string;
  user: string;
  grand_total: number;
  net_total: number;
  total_quantity: number;
}): Promise<{ name: string }> {
  return db.createDoc('POS Closing Entry', {
    ...data,
    docstatus: 0,
  });
}

export async function submitPOSClosingEntry(name: string): Promise<void> {
  await db.updateDoc('POS Closing Entry', name, { docstatus: 1 });
}
