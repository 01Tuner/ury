import { cn } from '../../lib/utils';
import { t } from '../../i18n';

interface SpinnerProps {
  className?: string;
  message?: string;
  hideMessage?: boolean;
}

export function Spinner({ className, message, hideMessage = false}: SpinnerProps) {
  const displayMessage = message ?? t('common.loading');
  return (
    <div className="flex items-center justify-center min-h-[inherit]">
      <div className="text-center">
        <div className={cn(
          "pos-spinner mx-auto",
          className
        )} />
        {!hideMessage && displayMessage && <p className="mt-4 text-gray-600">{displayMessage}</p>}
      </div>
    </div>
  );
}