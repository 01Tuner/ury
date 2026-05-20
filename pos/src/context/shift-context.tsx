import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { checkPOSOpening, validatePOSClose } from '../lib/pos-opening-api';
import { usePOSStore } from '../store/pos-store';
import { t } from '../i18n';
import ShiftOpenDialog from '../components/ShiftOpenDialog';
import ShiftCloseDialog from '../components/ShiftCloseDialog';

interface ShiftContextValue {
  isShiftOpen: boolean;
  requiresClose: boolean;
  isChecking: boolean;
  showCloseDialog: boolean;
  openCloseDialog: () => void;
  closeCloseDialog: () => void;
  refreshShiftStatus: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextValue | null>(null);

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) {
    throw new Error('useShift must be used within ShiftProvider');
  }
  return ctx;
}

interface ShiftProviderProps {
  children: ReactNode;
}

export function ShiftProvider({ children }: ShiftProviderProps) {
  const { posProfile } = usePOSStore();
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [requiresClose, setRequiresClose] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showCloseDialogVoluntary, setShowCloseDialogVoluntary] = useState(false);

  const refreshShiftStatus = useCallback(async () => {
    if (!posProfile) return;

    try {
      setIsChecking(true);
      const openingResponse = await checkPOSOpening();
      const open = openingResponse.message === 0;
      setIsShiftOpen(open);

      if (!open) {
        setRequiresClose(false);
        setShowCloseDialogVoluntary(false);
        return;
      }

      if (posProfile.custom_daily_pos_close === 1) {
        try {
          const closeResponse = await validatePOSClose(posProfile.name);
          setRequiresClose(closeResponse.message === 'Failed');
        } catch {
          setRequiresClose(true);
        }
      } else {
        setRequiresClose(false);
      }
    } catch {
      setIsShiftOpen(false);
      setRequiresClose(false);
    } finally {
      setIsChecking(false);
    }
  }, [posProfile]);

  useEffect(() => {
    if (posProfile) {
      refreshShiftStatus();
    }
  }, [posProfile, refreshShiftStatus]);

  const showOpenDialog = !isChecking && !!posProfile && !isShiftOpen;
  const showCloseDialog =
    (!isChecking && requiresClose) || showCloseDialogVoluntary;
  const blockPos = showOpenDialog || (requiresClose && showCloseDialog);

  const value = useMemo(
    () => ({
      isShiftOpen,
      requiresClose,
      isChecking,
      showCloseDialog: showCloseDialogVoluntary,
      openCloseDialog: () => setShowCloseDialogVoluntary(true),
      closeCloseDialog: () => setShowCloseDialogVoluntary(false),
      refreshShiftStatus,
    }),
    [isShiftOpen, requiresClose, isChecking, showCloseDialogVoluntary, refreshShiftStatus]
  );

  return (
    <ShiftContext.Provider value={value}>
      <div
        className={
          blockPos ? 'pointer-events-none select-none opacity-50' : undefined
        }
        aria-hidden={blockPos}
      >
        {children}
      </div>

      {isChecking && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-[100]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">{t('common.checking_pos_status')}</p>
          </div>
        </div>
      )}

      <ShiftOpenDialog open={showOpenDialog} onComplete={refreshShiftStatus} />
      <ShiftCloseDialog
        open={showCloseDialog}
        mandatory={requiresClose}
        autoSelectUnclosed={requiresClose}
        onComplete={() => {
          setShowCloseDialogVoluntary(false);
          refreshShiftStatus();
        }}
        onClose={() => setShowCloseDialogVoluntary(false)}
      />
    </ShiftContext.Provider>
  );
}

