import { FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui';
import { getOrderStatusTypes, OrderStatusType } from '../data/order-types';
import { usePOSStore } from '../store/pos-store';
import { t } from '../i18n';

interface OrderStatusSidebarProps {
  disabled?: boolean;
  selectedStatus: OrderStatusType;
  setSelectedStatus: (status: OrderStatusType) => void;
  getStatusCount?: (status: OrderStatusType) => number;
}

const OrderStatusSidebar = ({
  disabled,
  selectedStatus,
  setSelectedStatus,
}: OrderStatusSidebarProps) => {
  const { posProfile } = usePOSStore();

  const statusTypes = getOrderStatusTypes(posProfile?.view_all_status, posProfile?.paid_limit);

  const statusButton = (status: { value: string; label: string }, horizontal: boolean) => (
    <Button
      key={status.value}
      onClick={() => setSelectedStatus(status.value as OrderStatusType)}
      variant="ghost"
      className={
        horizontal
          ? cn(
              'pos-status-chip',
              selectedStatus === status.value ? 'pos-status-chip-active' : 'pos-status-chip-inactive'
            )
          : cn(
              'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative',
              selectedStatus === status.value ? 'pos-sidebar-item-active' : 'pos-sidebar-item'
            )
      }
      disabled={disabled}
    >
      {!horizontal && selectedStatus === status.value && (
        <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-e-full" />
      )}
      <div className={cn('flex items-center gap-2', !horizontal && 'ms-1')}>
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span>{t(`order_status_types.${status.value.toLowerCase().replace(/ /g, '_')}`)}</span>
      </div>
    </Button>
  );

  return (
    <>
      {/* Mobile: horizontal status chips */}
      <div
        className={cn(
          'pos-status-bar-mobile',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="pos-status-bar-mobile-inner">
          {statusTypes.map((status) => statusButton(status, true))}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <div
        className={cn(
          'hidden lg:flex w-64 bg-card border-e border-border h-full flex-col flex-shrink-0',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <nav className="flex-1 p-6 overflow-y-auto pos-scrollbar">
          <div className="bg-secondary border border-border rounded-lg p-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
              {t('orders.status_title')}
            </h2>
            <div className="space-y-1">
              {statusTypes.map((status) => statusButton(status, false))}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default OrderStatusSidebar;
