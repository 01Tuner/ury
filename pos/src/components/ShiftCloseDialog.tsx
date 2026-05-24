import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePOSStore } from '../store/pos-store';
import {
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui';
import { showToast } from './ui/toast';
import { t } from '../i18n';
import { isFrappeErrorDisplayed, parseFrappeError } from '../lib/frappe-error';
import { printClosingEntry } from '../lib/print';
import {
  aggregateClosingData,
  buildPaymentReconciliation,
  createPOSClosingEntry,
  formatDate,
  formatDateTime,
  formatTime,
  getOpenPOSOpeningEntries,
  getPOSOpeningEntry,
  getPosInvoicesForClosing,
  ModeOfPaymentBalance,
  POSOpeningEntryListItem,
  submitPOSClosingEntry,
} from '../lib/pos-shift-api';
import { getActivePosOpeningEntry } from '../lib/pos-opening-api';

interface ShiftCloseDialogProps {
  open: boolean;
  mandatory?: boolean;
  autoSelectUnclosed?: boolean;
  onComplete: () => void;
  onClose?: () => void;
}

type ShiftStatus = 'selecting' | 'loading' | 'creating' | 'submitted';

const ShiftCloseDialog = ({
  open,
  mandatory = false,
  autoSelectUnclosed = false,
  onComplete,
  onClose,
}: ShiftCloseDialogProps) => {
  const { posProfile } = usePOSStore();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [periodEndDate, setPeriodEndDate] = useState(() => formatDateTimeForInput(new Date()));
  const [postingDate] = useState(() => formatDate(new Date()));
  const [postingTime, setPostingTime] = useState(() => formatTimeForInput(new Date()));
  const [openEntries, setOpenEntries] = useState<POSOpeningEntryListItem[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [showEntryPicker, setShowEntryPicker] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [cashier, setCashier] = useState('');
  const [openingBalance, setOpeningBalance] = useState<ModeOfPaymentBalance[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [netTotal, setNetTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [status, setStatus] = useState<ShiftStatus>('selecting');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [closingEntryName, setClosingEntryName] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [posTransactions, setPosTransactions] = useState<
    Array<{ pos_invoice: string; date: string; amount: number }>
  >([]);
  const [aggregatedPayments, setAggregatedPayments] = useState<
    Array<{ mode_of_payment: string; expected_amount: number }>
  >([]);

  useEffect(() => {
    if (!open || !posProfile) return;
    loadOpenEntries();
  }, [open, posProfile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEntryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOpenEntries = async () => {
    if (!posProfile) return;
    try {
      const entries = await getOpenPOSOpeningEntries(posProfile.branch, posProfile.name);
      setOpenEntries(entries);

      const activeEntry = await getActivePosOpeningEntry(posProfile.name);
      if (activeEntry && entries.some((e) => e.name === activeEntry)) {
        await selectOpeningEntry(activeEntry);
        return;
      }

      if (autoSelectUnclosed && entries.length > 0) {
        const oldest = [...entries].sort(
          (a, b) =>
            new Date(a.posting_date ?? 0).getTime() - new Date(b.posting_date ?? 0).getTime()
        )[0];
        await selectOpeningEntry(oldest.name);
      } else if (entries.length === 1) {
        await selectOpeningEntry(entries[0].name);
      }
    } catch (err) {
      if (!isFrappeErrorDisplayed(err)) {
        showToast.error(parseFrappeError(err));
      }
    }
  };

  const selectOpeningEntry = async (name: string) => {
    if (!posProfile) return;
    setSelectedEntry(name);
    setShowEntryPicker(false);
    setStatus('loading');
    setLoading(true);
    try {
      const opening = await getPOSOpeningEntry(name);
      setPeriodStartDate(opening.period_start_date);
      setCashier(opening.user || opening.owner);
      setOpeningBalance(
        (opening.balance_details || []).map((row) => ({
          ...row,
          opening_amount: Number(row.opening_amount) || 0,
        }))
      );

      const invoices = await getPosInvoicesForClosing({
        start: opening.period_start_date,
        end: formatDateTime(new Date(periodEndDate)),
        pos_profile: posProfile.name,
        user: opening.user || opening.owner,
      });

      const totals = aggregateClosingData(invoices);
      setGrandTotal(totals.grandTotal);
      setNetTotal(totals.netTotal);
      setTotalQty(totals.totalQty);
      setTotalInvoices(totals.totalInvoices);
      setPosTransactions(totals.posTransactions);
      setAggregatedPayments(totals.payments);

      setOpeningBalance((prev) =>
        prev.map((row) => {
          const matched = totals.payments.find((p) => p.mode_of_payment === row.mode_of_payment);
          const expected = matched?.expected_amount ?? 0;
          return { ...row, expected_amount: expected, closing_amount: expected };
        })
      );
      setStatus('creating');
    } catch (err) {
      if (!isFrappeErrorDisplayed(err)) {
        showToast.error(parseFrappeError(err));
      }
      setStatus('selecting');
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = async () => {
    if (!selectedEntry || !posProfile) return;
    setLoading(true);
    try {
      const opening = await getPOSOpeningEntry(selectedEntry);
      const invoices = await getPosInvoicesForClosing({
        start: opening.period_start_date,
        end: formatDateTime(new Date(periodEndDate)),
        pos_profile: posProfile.name,
        user: opening.user || opening.owner,
      });
      const totals = aggregateClosingData(invoices);
      setGrandTotal(totals.grandTotal);
      setNetTotal(totals.netTotal);
      setTotalQty(totals.totalQty);
      setTotalInvoices(totals.totalInvoices);
      setPosTransactions(totals.posTransactions);
      setAggregatedPayments(totals.payments);
      setOpeningBalance((prev) =>
        prev.map((row) => {
          const matched = totals.payments.find((p) => p.mode_of_payment === row.mode_of_payment);
          const expected = matched?.expected_amount ?? 0;
          return {
            ...row,
            expected_amount: expected,
            closing_amount: row.closing_amount ?? expected,
          };
        })
      );
    } catch (err) {
      if (!isFrappeErrorDisplayed(err)) {
        showToast.error(parseFrappeError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !selectedEntry || status !== 'creating') return;
    const timer = setTimeout(() => refreshInvoices(), 400);
    return () => clearTimeout(timer);
  }, [periodEndDate, open, selectedEntry, status]);

  const updateClosingAmount = (index: number, value: number) => {
    setOpeningBalance((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const expected = row.expected_amount ?? 0;
        return {
          ...row,
          closing_amount: value,
          difference: value - expected,
        };
      })
    );
  };

  const handleConfirmSubmit = async () => {
    if (!posProfile || !selectedEntry) return;
    setSubmitting(true);
    try {
      const reconciliation = buildPaymentReconciliation(openingBalance, aggregatedPayments);
      const doc = await createPOSClosingEntry({
        period_start_date: periodStartDate,
        period_end_date: formatDateTime(new Date(periodEndDate)),
        posting_date: postingDate,
        posting_time: formatTime(new Date(`1970-01-01T${postingTime}`)),
        company: posProfile.company,
        pos_profile: posProfile.name,
        payment_reconciliation: reconciliation,
        pos_transactions: posTransactions,
        pos_opening_entry: selectedEntry,
        user: cashier,
        grand_total: grandTotal,
        net_total: netTotal,
        total_quantity: totalQty,
      });
      await submitPOSClosingEntry(doc.name);
      setClosingEntryName(doc.name);
      setStatus('submitted');
      setShowSubmitConfirm(false);
      showToast.success(t('shift.close_submitted'));
    } catch (err) {
      if (!isFrappeErrorDisplayed(err)) {
        showToast.error(parseFrappeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!closingEntryName || !posProfile) return;
    setPrinting(true);
    try {
      await printClosingEntry({ entryName: closingEntryName, posProfile });
      showToast.success(t('shift.print_success'));
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t('shift.print_failed')
      );
    } finally {
      setPrinting(false);
    }
  };

  const handleDialogClose = () => {
    if (mandatory) return;
    onClose?.();
  };

  if (!posProfile) return null;

  const canPickEntry = status === 'selecting' || status === 'creating';
  const canPrint = !!closingEntryName && status === 'submitted';

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleDialogClose()} className="!z-[100]">
        <DialogContent
          size="4xl"
          showCloseButton={!mandatory}
          onClose={mandatory ? undefined : handleDialogClose}
          className="flex flex-col max-h-[92vh] p-0 overflow-hidden"
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <DialogTitle>{t('shift.close_title')}</DialogTitle>
              {status === 'submitted' && <Badge>{t('shift.status_submitted')}</Badge>}
            </div>
            <p className="text-sm text-gray-600 mt-2 text-start">
              {mandatory ? t('shift.close_required_hint') : t('shift.close_description')}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-6 py-4">
            <section className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="md:col-span-2 relative" ref={pickerRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.pos_opening_entry')}
                </label>
                <Input
                  value={selectedEntry ?? ''}
                  placeholder={t('shift.select_opening_entry')}
                  readOnly
                  onClick={() => canPickEntry && setShowEntryPicker(true)}
                  className={canPickEntry ? 'cursor-pointer' : ''}
                />
                {showEntryPicker && (
                  <div className="pos-dropdown" role="listbox">
                    {openEntries.length === 0 ? (
                      <p className="pos-dropdown-empty">{t('shift.no_open_entries')}</p>
                    ) : (
                      openEntries.map((entry) => (
                        <button
                          key={entry.name}
                          type="button"
                          role="option"
                          aria-selected={selectedEntry === entry.name}
                          className={cn(
                            'pos-dropdown-item',
                            selectedEntry === entry.name && 'pos-dropdown-item-active'
                          )}
                          onClick={() => selectOpeningEntry(entry.name)}
                        >
                          <span className="font-medium">{entry.name}</span>
                          {entry.posting_date && (
                            <span className="text-muted-foreground ms-2">({entry.posting_date})</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.period_start')}
                </label>
                <Input value={periodStartDate} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.period_end')}
                </label>
                <Input
                  type="datetime-local"
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  disabled={status === 'submitted'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.posting_date')}
                </label>
                <Input value={postingDate} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.posting_time')}
                </label>
                <Input
                  type="time"
                  value={postingTime}
                  onChange={(e) => setPostingTime(e.target.value)}
                  disabled={status === 'submitted'}
                  step={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.company')}
                </label>
                <Input value={posProfile.company} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('shift.cashier')}
                </label>
                <Input value={cashier} readOnly />
              </div>
            </section>

            {loading && (
              <p className="text-center text-gray-500 py-8">{t('shift.loading_invoices')}</p>
            )}

            {!loading && openingBalance.length > 0 && (
              <>
                <h2 className="text-base font-semibold mb-3">
                  {t('shift.payment_reconciliation')}
                </h2>
                <div className="border rounded-lg overflow-x-auto mb-6">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-start">{t('shift.mode_of_payment')}</th>
                        <th className="px-4 py-3 text-center">{t('shift.opening_amount')}</th>
                        <th className="px-4 py-3 text-center">{t('shift.expected_amount')}</th>
                        <th className="px-4 py-3 text-center">{t('shift.closing_amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openingBalance.map((row, index) => (
                        <tr key={row.mode_of_payment} className="border-t">
                          <td className="px-4 py-3 font-medium">{row.mode_of_payment}</td>
                          <td className="px-4 py-3 text-center">{row.opening_amount}</td>
                          <td className="px-4 py-3 text-center">
                            {(row.expected_amount ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="text-center"
                              value={row.closing_amount ?? row.expected_amount ?? 0}
                              onChange={(e) =>
                                updateClosingAmount(index, parseFloat(e.target.value) || 0)
                              }
                              disabled={status !== 'creating'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h2 className="text-base font-semibold mb-3">{t('shift.totals')}</h2>
                <section className="grid gap-4 md:grid-cols-2 mb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shift.grand_total')}
                    </label>
                    <Input value={grandTotal.toFixed(2)} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shift.total_invoices')}
                    </label>
                    <Input value={String(totalInvoices)} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shift.net_total')}
                    </label>
                    <Input value={netTotal.toFixed(2)} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shift.total_quantity')}
                    </label>
                    <Input value={String(totalQty)} readOnly />
                  </div>
                </section>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 flex-wrap gap-2">
            {canPrint && (
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={printing}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                {printing ? t('shift.printing') : t('shift.print_report')}
              </Button>
            )}
            {status === 'creating' && (
              <Button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={submitting || loading || !selectedEntry}
              >
                {t('shift.submit')}
              </Button>
            )}
            {status === 'submitted' && (
              <Button onClick={onComplete}>{t('shift.continue_to_pos')}</Button>
            )}
            {!mandatory && status !== 'submitted' && (
              <Button variant="outline" onClick={handleDialogClose}>
                {t('common.cancel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent onClose={() => setShowSubmitConfirm(false)} size="lg">
          <DialogHeader>
            <DialogTitle>{t('shift.confirm_submit')}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 mb-4 px-6">
            {t('shift.confirm_submit_close', { name: selectedEntry ?? '' })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={submitting}>
              {submitting ? t('shift.submitting') : t('shift.yes_submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

function formatDateTimeForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default ShiftCloseDialog;
