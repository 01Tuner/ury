import { cn } from '../../lib/utils';
import { t } from '../../i18n';
import { RestaurantLoader, RestaurantLoaderSize } from './restaurant-loader';

interface SpinnerProps {
  className?: string;
  message?: string;
  hideMessage?: boolean;
  size?: RestaurantLoaderSize;
}

export function Spinner({
  className,
  message,
  hideMessage = false,
  size = 'lg',
}: SpinnerProps) {
  const displayMessage = message ?? t('common.loading');
  return (
    <div className="flex items-center justify-center min-h-[inherit]">
      <div className={cn('text-center', className)}>
        <RestaurantLoader size={size} className="mx-auto" />
        {!hideMessage && displayMessage && (
          <p className="mt-4 text-muted-foreground">{displayMessage}</p>
        )}
      </div>
    </div>
  );
}
