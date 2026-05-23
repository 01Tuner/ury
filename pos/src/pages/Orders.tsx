import React, { useEffect, useRef } from 'react';
import { Clock, User, UserCheck, Receipt, Printer, Pencil, X } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '../components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { showToast } from '../components/ui/toast';
import OrderStatusSidebar from '../components/OrderStatusSidebar';
import { useRootStore } from '../store/root-store';
import { cn } from '../lib/utils';
import { CurrencyAmount } from '../components/CurrencyAmount';
import { Spinner } from '../components/ui/spinner';
import { RestaurantLoader } from '../components/ui/restaurant-loader';
import { Textarea } from '../components/ui/textarea';
import { usePOSStore } from '../store/pos-store';
import { useNavigate } from 'react-router-dom';
import PaymentDialog from '../components/PaymentDialog';
import { printOrder } from '../lib/print';
import { call } from '../lib/frappe-sdk';
import { t } from '../i18n';

export default function Orders() {
  const { 
    orders,
    orderLoading,
    error,
    selectedStatus,
    pagination,
    selectedOrder,
    selectedOrderItems,
    selectedOrderTaxes,
    selectedOrderLoading,
    selectedOrderError,
    fetchOrders,
    setSelectedStatus,
    goToNextPage,
    goToPreviousPage,
    selectOrder,
    clearSelectedOrder,
    followOrderInStatusTab,
    orderSearchQuery
  } = useRootStore();

  const posStore = usePOSStore();
  const navigate = useNavigate();
  const mounted = useRef(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // Skip the first run
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSearchQuery]);


  // Function to format the date and time
  const formatDateTime = (date: string, time: string) => {
    const formattedDate = new Date(date + ' ' + time).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
    return formattedDate;
  };

  const handleOrderClick = (order: any) => {
    selectOrder(order);
  };

  // Helper function to get badge variant based on order status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Draft':
      case 'Unbilled':
        return 'secondary';
      case 'Recently Paid':
      case 'Paid':
      case 'Consolidated':
        return 'default';
      case 'Return':
        return 'destructive';
      default:
        return 'default';
    }
  };

  async function handleCancelOrder() {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      showToast.error(t('errors.enter_cancel_reason'));
      return;
    }
    setCancelLoading(true);
    try {
      await call.post('ury.ury.doctype.ury_order.ury_order.cancel_order', {
        invoice_id: selectedOrder.name,
        reason: cancelReason
      })
      showToast.success(t('success.order_cancelled'));
      setCancelDialogOpen(false);
      setCancelReason('');
      clearSelectedOrder();
      fetchOrders();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('errors.failed_cancel_order'));
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleEditOrder() {
    if (!selectedOrder) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/method/frappe.client.get?doctype=POS+Invoice&name=${selectedOrder.name}`);
      if (!res.ok) throw new Error('Failed to fetch order details');
      const data = await res.json();
      const order = data.message;
      // Fill POS store
      posStore.resetOrderState();
      posStore.setSelectedOrderType(order.order_type);
      posStore.setOrderForUpdate(order.name);
      if (order.restaurant_table) {
        posStore.setSelectedTable(order.restaurant_table, order.custom_restaurant_room || null,true);
      }
      posStore.setSelectedCustomer({ id: order.customer, name: order.customer_name, phone: order.mobile_number });
      // Fill cart
      const items = (order.items || []).map((item: any) => ({
        id: item.item_code,
        name: item.item_name,
        price: item.rate,
        quantity: item.qty,
        amount: item.amount,
        image: item.image || null,
        uniqueId: item.name,
        item: item.item_code,
        item_name: item.item_name,
        item_image: null,
        course: '',
        description: item.description || '',
        special_dish: 0,
        tax_rate: 0,
      }));
      for (const cartItem of items) {
        await posStore.addToOrder(cartItem);
      }
      // Redirect to POS page
      navigate('/');
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('errors.failed_edit_order'));
    } finally {
      setEditLoading(false);
    }
  }

  async function handlePrintOrder() {
    if (!selectedOrder || !posStore.posProfile) return;
    setIsPrinting(true);
    try {
      await printOrder({
        orderId: selectedOrder.name,
        posProfile: posStore.posProfile
      });
      showToast.success(t('success.printed'));
      // Locally update invoice_printed; refresh list without changing tab or clearing selection.
      if (selectedOrder && typeof selectedOrder === 'object') {
        await selectOrder({ ...selectedOrder, invoice_printed: 1 });
      }
      await fetchOrders();
    } catch (err: any) {
      showToast.error(t('errors.print_failed', { reason: err?.message || String(err) }));
    } finally {
      setIsPrinting(false);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600 mb-2">Failed to load orders</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const showMobileDetail = !!selectedOrder;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden bg-background">
      <OrderStatusSidebar
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden lg:pe-[var(--order-panel-width)]">
        <div className="flex-1 overflow-y-auto pos-surface p-4 pb-40">
          {orderLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center mt-10">
              <p className="text-muted-foreground">{t('orders.no_orders_found')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-screen-xl mx-auto">
              {orders.map((order) => (
                <Card 
                  key={order.name} 
                  className={`p-0 hover:shadow-md transition-shadow flex flex-col overflow-hidden cursor-pointer ${
                    selectedOrder?.name === order.name ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                  onClick={() => handleOrderClick(order)}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="p-3 bg-secondary border-b border-border">
                    <h3 className="font-medium text-foreground text-sm truncate" title={order.name}>
                      {order.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {order.restaurant_table ? `Table ${order.restaurant_table} • ` : ''}{t(`order_types.${order.order_type.toLowerCase().replace(/ /g, '_')}`)}
                        </p>
                      </div>
                      <Badge variant={getBadgeVariant(order.status)} className="ms-2">
                        {t(`order_status_types.${order.status.toLowerCase().replace(/ /g, '_')}`)}
                      </Badge>
                    </div>
                    </div>

                    {/* Content section - matches MenuCard padding and structure */}
                    <div className="flex-1 p-3 flex flex-col">
                      <div className="">
                        <p className="text-sm text-foreground">{order.customer}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDateTime(order.posting_date, order.posting_time)}</span>
                      </div>

                      {/* Total - pushed to bottom like MenuCard */}
                      <div className="mt-auto pt-2">
                        <CurrencyAmount
                          amount={order.rounded_total}
                          className="text-sm font-semibold text-foreground"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Pagination Controls */}
          {!orderLoading && (
            <div className="py-4">
              <div className="flex justify-center items-center gap-x-4 max-w-screen-xl mx-auto">
                <Button
                  onClick={goToPreviousPage}
                  disabled={pagination.currentPage === 1}
                  variant="outline"
                  className='w-20'
                  size="xs"
                >
                  {t('orders.pagination.previous')}
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t('orders.pagination.page', { number: pagination.currentPage.toString() })}
                  </span>
                </div>
                <Button
                  onClick={goToNextPage}
                  disabled={!pagination.hasNextPage}
                  variant="outline"
                  className='w-20'
                  size="xs"
                >
                  {t('orders.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMobileDetail && (
        <button
          type="button"
          className="pos-order-panel-backdrop lg:hidden"
          aria-label={t('common.close')}
          onClick={() => clearSelectedOrder()}
        />
      )}

      <div
        className={cn(
          'pos-detail-panel',
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        )}
      >
        {!selectedOrder ? (
          <div className="text-center h-full flex flex-col items-center justify-center text-muted-foreground p-6">
            <p className="text-lg font-medium mb-2">{t('order.select_to_view')}</p>
            <p className="text-sm">{t('orders.click_to_view')}</p>
          </div>
        ) : selectedOrderLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : selectedOrderError ? (
          <div className="text-center h-full flex flex-col items-center justify-center text-red-500 p-6">
            <p className="text-lg font-medium mb-2">Failed to load order details</p>
            <p className="text-sm">{selectedOrderError}</p>
          </div>
        ) : (
          <>
            {/* Fixed Header */}
            <div className="sticky top-0 start-0 end-0 z-20 bg-card border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between min-h-[64px] gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate flex-1 min-w-0">{selectedOrder.name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8"
                  onClick={() => clearSelectedOrder()}
                  aria-label={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </Button>
                {/* Only show edit and cancel buttons for Draft, Unbilled, and Recently Paid orders */}
                {(selectedOrder.status === 'Draft' || selectedOrder.status === 'Unbilled' || selectedOrder.status === 'Recently Paid') && (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md p-2 bg-secondary hover:bg-accent text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Edit order"
                      onClick={handleEditOrder}
                      disabled={editLoading}
                    >
                      <Pencil className="w-4 h-4" />
                      {editLoading && <span className="ms-2 text-xs">{t('common.loading')}</span>}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md p-2 bg-secondary hover:bg-accent text-destructive focus:outline-none focus:ring-2 focus:ring-destructive"
                      aria-label="Cancel order"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                <Badge variant={getBadgeVariant(selectedOrder.status)}>
                  {t(`order_status_types.${selectedOrder.status.toLowerCase().replace(/ /g, '_')}`)}
                </Badge>
              </div>
            </div>
            {/* Cancel Order Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('order.cancel_order')}</DialogTitle>
                  <DialogDescription>
                    {t('errors.enter_cancel_reason')}
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 mb-3">
                <Textarea
                  placeholder={t('order.enter_cancel_reason')}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  disabled={cancelLoading}
                  autoFocus
                />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelLoading}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="danger" onClick={handleCancelOrder} disabled={cancelLoading}>
                    {cancelLoading ? t('common.cancelling') : t('common.confirm_cancel')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 pb-40">
              {/* Order Header (now only info, not name/buttons) */}
              <div className="mb-6">
                {/* Two-column Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  {/* First column: customer and time */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{selectedOrder.customer}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{formatDateTime(selectedOrder.posting_date, selectedOrder.posting_time)}</span>
                    </div>
                  </div>
                  {/* Second column: waiter and table */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedOrder.waiter}</span>
                    </div>
                    {selectedOrder.restaurant_table && (
                      <div className="flex items-center gap-3 text-sm">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedOrder.restaurant_table}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t('order.items_title')}</h3>
                <div className="space-y-3">
                  {selectedOrderItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-start py-2 border-b border-border">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                      </div>
                      <div className="text-right">
                        <CurrencyAmount amount={item.amount} className="text-sm font-semibold text-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxes */}
              {selectedOrderTaxes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">{t('order.taxes_charges')}</h3>
                  <div className="space-y-2">
                    {selectedOrderTaxes.map((tax, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground">{tax.description}</span>
                        <CurrencyAmount amount={tax.rate} className="text-sm font-medium text-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Section - Single Row: Print | Payment | Total */}
            <div className="border-t border-border p-6 bg-secondary sticky bottom-0 start-0 end-0 z-10">
              <div className="flex items-center gap-3 w-full">
                {/* Print Icon Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={handlePrintOrder}
                  aria-label="Print"
                  disabled={isPrinting}
                >
                  {isPrinting ? <RestaurantLoader size="sm" /> : <Printer className="w-5 h-5" />}
                </Button>
                {/* Payment Button - Only show for Draft, Unbilled, and Recently Paid orders */}
                {(selectedOrder.status === 'Draft' || selectedOrder.status === 'Unbilled' || selectedOrder.status === 'Recently Paid') && (
                  <Button
                    className="flex-1"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    {t('order.payment')}
                  </Button>
                )}
                {/* Total */}
                <CurrencyAmount
                  amount={selectedOrder.rounded_total}
                  className="ms-auto text-xl font-bold text-foreground whitespace-nowrap"
                />
              </div>
            </div>
          </>
        )}
      </div>
      {showPaymentDialog && selectedOrder && (
        <PaymentDialog
          onClose={() => setShowPaymentDialog(false)}
          grandTotal={selectedOrder.grand_total}
          roundedTotal={selectedOrder.rounded_total}
          invoice={selectedOrder.name}
          invoicePrinted={selectedOrder.invoice_printed}
          customer={selectedOrder.customer}
          posProfile={posStore.posProfile?.name || ''}
          table={selectedOrder.restaurant_table || null}
          cashier={posStore.posProfile?.cashier || ''}
          owner={posStore.posProfile?.cashier || ''}
          followOrderInStatusTab={followOrderInStatusTab}
        />
      )}
    </div>
  );
};
