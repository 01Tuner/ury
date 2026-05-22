import { useCallback, useEffect, useState } from 'react';
import { t } from '../i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button, Select, SelectItem } from './ui';
import { listQzPrinters } from '../lib/print-qz';
import { getProductionUnitsForBranch, type ProductionUnit } from '../lib/production-api';
import {
  loadQzPrinterMapping,
  saveQzPrinterMapping,
  type QzPrinterMapping,
} from '../lib/qz-printer-mapping';
import { showToast } from './ui/toast';

interface PrinterMappingDialogProps {
  open: boolean;
  onClose: () => void;
  qzHost: string;
  posProfileName: string;
  branch: string;
}

const NONE_VALUE = '__none__';

export default function PrinterMappingDialog({
  open,
  onClose,
  qzHost,
  posProfileName,
  branch,
}: PrinterMappingDialogProps) {
  const [printers, setPrinters] = useState<string[]>([]);
  const [productionUnits, setProductionUnits] = useState<ProductionUnit[]>([]);
  const [billPrinter, setBillPrinter] = useState<string>(NONE_VALUE);
  const [productionPrinters, setProductionPrinters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!qzHost) {
      setError(t('printer_mapping.qz_host_missing'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [printerList, units] = await Promise.all([
        listQzPrinters(qzHost),
        getProductionUnitsForBranch(branch),
      ]);
      setPrinters(printerList);
      setProductionUnits(units);

      const saved = loadQzPrinterMapping(posProfileName);
      setBillPrinter(saved.billPrinter ?? NONE_VALUE);
      const prodMap: Record<string, string> = {};
      for (const unit of units) {
        prodMap[unit.name] =
          saved.productionPrinters[unit.name] ?? NONE_VALUE;
      }
      setProductionPrinters(prodMap);
    } catch (err) {
      console.error('Printer mapping load failed:', err);
      setError(
        err instanceof Error ? err.message : t('printer_mapping.qz_connection_failed')
      );
    } finally {
      setLoading(false);
    }
  }, [qzHost, branch, posProfileName]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleSave = () => {
    if (billPrinter === NONE_VALUE) {
      showToast.error(t('printer_mapping.bill_printer_required'));
      return;
    }

    const mapping: QzPrinterMapping = {
      billPrinter: billPrinter === NONE_VALUE ? null : billPrinter,
      productionPrinters: {},
    };

    for (const [unitName, printer] of Object.entries(productionPrinters)) {
      if (printer && printer !== NONE_VALUE) {
        mapping.productionPrinters[unitName] = printer;
      }
    }

    setSaving(true);
    try {
      saveQzPrinterMapping(posProfileName, mapping);
      showToast.success(t('printer_mapping.mapping_saved'));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant="large" onClose={onClose} className="overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t('printer_mapping.title')}</DialogTitle>
          <DialogDescription>{t('printer_mapping.description')}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('printer_mapping.bill_printer')}
                </label>
                <Select
                  value={billPrinter}
                  onValueChange={setBillPrinter}
                  placeholder={t('printer_mapping.select_printer')}
                >
                  <SelectItem value={NONE_VALUE}>
                    {t('printer_mapping.none')}
                  </SelectItem>
                  {printers.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {productionUnits.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {t('printer_mapping.production_printers')}
                  </p>
                  {productionUnits.map((unit) => (
                    <div key={unit.name} className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {unit.production || unit.name}
                      </label>
                      <Select
                        value={productionPrinters[unit.name] ?? NONE_VALUE}
                        onValueChange={(value) =>
                          setProductionPrinters((prev) => ({
                            ...prev,
                            [unit.name]: value,
                          }))
                        }
                        placeholder={t('printer_mapping.select_printer')}
                      >
                        <SelectItem value={NONE_VALUE}>
                          {t('printer_mapping.none')}
                        </SelectItem>
                        {printers.map((p) => (
                          <SelectItem key={`${unit.name}-${p}`} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t('printer_mapping.cache_note')}
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {t('printer_mapping.refresh_printers')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading || !!error || saving}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
