import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { usePOSStore } from '../store/pos-store';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui';
import { showToast } from './ui/toast';
import { t } from '../i18n';
import { parseFrappeError } from '../lib/frappe-error';
import {
  formatDate,
  formatDateTime,
  getModeOfPaymentBalances,
  ModeOfPaymentBalance,
  openAndSubmitPOSOpeningEntry,
} from '../lib/pos-shift-api';

interface ShiftOpenDialogProps {
  open: boolean;
  onComplete: () => void;
}

const ShiftOpenDialog = ({ open, onComplete }: ShiftOpenDialogProps) => {
  const { posProfile } = usePOSStore();
  const [startDate, setStartDate] = useState(() => formatDateTimeForInput(new Date()));
  const [postingDate] = useState(() => formatDate(new Date()));
  const [balanceDetails, setBalanceDetails] = useState<ModeOfPaymentBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setStartDate(formatDateTimeForInput(new Date()));
    getModeOfPaymentBalances()
      .then(setBalanceDetails)
      .catch((err) => showToast.error(parseFrappeError(err)))
      .finally(() => setLoading(false));
  }, [open]);

  const updateOpeningAmount = (index: number, value: number) => {
    setBalanceDetails((prev) =>
      prev.map((row, i) => (i === index ? { ...row, opening_amount: value } : row))
    );
  };

  const removeRow = (index: number) => {
    setBalanceDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenShift = async () => {
    if (!posProfile) {
      showToast.error(t('errors.pos_profile_not_loaded'));
      return;
    }
    setSubmitting(true);
    try {
      await openAndSubmitPOSOpeningEntry({
        period_start_date: formatDateTime(new Date(startDate)),
        posting_date: postingDate,
        company: posProfile.company,
        pos_profile: posProfile.name,
        balance_details: balanceDetails,
        branch: posProfile.branch,
        user: posProfile.cashier,
      });
      showToast.success(t('shift.open_submitted'));
      onComplete();
    } catch (err) {
      showToast.error(parseFrappeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!posProfile) return null;

  return (
    <Dialog open={open} className="!z-[100]">
      <DialogContent
        size="3xl"
        showCloseButton={false}
        className="flex flex-col max-h-[90vh] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{t('shift.open_title')}</DialogTitle>
          <p className="text-sm text-gray-600 mt-2 text-start">
            {t('shift.open_required_hint')}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <section className="grid gap-4 md:grid-cols-2 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shift.period_start')}
              </label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
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
                {t('shift.company')}
              </label>
              <Input value={posProfile.company} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shift.cashier')}
              </label>
              <Input value={posProfile.cashier} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shift.pos_profile')}
              </label>
              <Input value={posProfile.name} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shift.branch')}
              </label>
              <Input value={posProfile.branch} readOnly />
            </div>
          </section>

          <h2 className="text-base font-semibold mb-3">{t('shift.opening_balance')}</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-start">{t('shift.mode_of_payment')}</th>
                  <th className="px-4 py-3 text-center">{t('shift.opening_amount')}</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : (
                  balanceDetails.map((row, index) => (
                    <tr key={row.mode_of_payment} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.mode_of_payment}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="text-center"
                          value={row.opening_amount}
                          onChange={(e) =>
                            updateOpeningAmount(index, parseFloat(e.target.value) || 0)
                          }
                          disabled={submitting}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                          disabled={submitting}
                          aria-label={t('shift.remove_row')}
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button
            onClick={handleOpenShift}
            disabled={submitting || loading}
            className="w-full sm:w-auto"
          >
            {submitting ? t('shift.opening_shift') : t('shift.open_shift')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

export default ShiftOpenDialog;
