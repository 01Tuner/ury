import { useState } from 'react';
import { Trash2, Edit, FrownIcon, Plus, Loader2, MessageSquare, ShoppingCart, X } from 'lucide-react';
import { usePOSStore } from '../store/pos-store';
import { formatCurrency, cn } from '../lib/utils';
import { CustomerSelect } from './CustomerSelect';
import ProductDialog from './ProductDialog';
import OrderTypeSelect from './OrderTypeSelect';
import CommentDialog from './CommentDialog';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';
import { syncOrder, type SyncOrderResponse } from '../lib/order-api';
import { printKotsWithQz } from '../lib/print-kot-qz';
import { useRootStore } from '../store/root-store';
import type { RootState } from '../store/root-store';
import { showToast } from './ui/toast';
import { DINE_IN } from '../data/order-types';
import { t } from '../i18n';

const OrderPanel = () => {
  const { 
    activeOrders, 
    removeFromOrder, 
    updateQuantity, 
    clearOrder, 
    setSelectedItem,
    orderLoading,
    isOrderInteractionDisabled,
    isUpdatingOrder,
    posProfile,
    selectedOrderType,
    selectedTable,
    selectedRoom,
    selectedCustomer,
    selectedAggregator,
    resetOrderState,
    paymentModes,
    orderId,
    orderComment,
    setOrderComment
  } = usePOSStore();
  const user = useRootStore((state: RootState) => state.user);
  const [editingItem, setEditingItem] = useState<typeof activeOrders[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const cartItemCount = activeOrders.reduce((sum, item) => sum + item.quantity, 0);

  const calculateItemTotal = (item: typeof activeOrders[0]) => {
    const basePrice = item.selectedVariant?.price || item.price;
    const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
    return (basePrice + addonsTotal) * item.quantity;
  };

  const total = activeOrders.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );

  const handleEdit = (item: typeof activeOrders[0]) => {
    const menuItem = {
      ...item,
      variants: item.variants,
      addons: item.addons,
    };
    setSelectedItem(menuItem);
    setEditingItem(item);
  };

  const handleCommentSave = (comment: string) => {
    setOrderComment(comment);
  };

  const handleSubmit = async () => {
    try {
      if (!posProfile) {
        throw new Error(t('errors.pos_profile_not_found'));
      }

      if (!user?.name) {
        throw new Error(t('errors.user_not_logged_in'));
      }

      // Validate customer/aggregator details
      if (selectedOrderType === 'Aggregators') {
        if (!selectedAggregator?.customer) {
          showToast.error(t('errors.select_aggregator'));
          return;
        }
      } else if (!selectedCustomer?.id) {
        showToast.error(t('errors.select_customer'));
        return;
      }

      // Validate table selection for dine-in orders
      if (selectedOrderType === DINE_IN && !selectedTable) {
        showToast.error(t('errors.select_table', { order_type: DINE_IN }));
        return;
      }

      setIsSubmitting(true);
      
      const orderData = {
        items: activeOrders.map(item => ({
          item: item.id,
          item_name: item.name,
          rate: item.selectedVariant?.price || item.price,
          qty: item.quantity,
          comment: item.comment || undefined
        })),
        no_of_pax: 1,
        pos_profile: posProfile.name,
        order_type: selectedOrderType,
        table: selectedTable || undefined,
        room: selectedRoom || undefined,
        customer: selectedOrderType === 'Aggregators' ? selectedAggregator?.customer : selectedCustomer?.id,
        aggregator_id: selectedOrderType === 'Aggregators' ? selectedAggregator?.customer : undefined,
        cashier: posProfile.cashier,
        owner: user.name,
        mode_of_payment: paymentModes[0],
        last_invoice: isUpdatingOrder ? orderId : null,
        invoice: isUpdatingOrder ? orderId : null,
        waiter: user.name,
        comments: orderComment || undefined
      };

      const syncRes = await syncOrder(orderData);
      const syncPayload =
        (syncRes as { message?: SyncOrderResponse }).message ??
        (syncRes as SyncOrderResponse);

      if (
        Number(posProfile.qz_print) === 1 &&
        posProfile.qz_host &&
        syncPayload.created_kots?.length
      ) {
        const kotFormat = posProfile.kot_print_format;
        if (!kotFormat) {
          showToast.info(t('printer_mapping.kot_format_missing'));
        } else {
          try {
            const { printed, skipped } = await printKotsWithQz({
              host: posProfile.qz_host,
              kots: syncPayload.created_kots,
              posProfileName: posProfile.name,
              kotPrintFormat: kotFormat,
            });
            if (printed > 0) {
              showToast.success(
                t('printer_mapping.kot_print_success', { count: String(printed) })
              );
            }
            if (skipped > 0) {
              showToast.info(
                t('printer_mapping.kot_print_skipped', { count: String(skipped) })
              );
            }
          } catch (kotPrintErr) {
            console.error('KOT QZ print failed:', kotPrintErr);
            showToast.error(
              t('printer_mapping.kot_print_failed', {
                reason:
                  kotPrintErr instanceof Error
                    ? kotPrintErr.message
                    : String(kotPrintErr),
              })
            );
          }
        }
      }

      // Reset all states after successful order submission
      resetOrderState();
      showToast.success(isUpdatingOrder ? t('success.order_updated') : t('success.order_created'));
    } catch (error) {
      console.error('Failed to sync order:', error);
      // Frappe API error handling
      if (error && typeof error === 'object' && '_server_messages' in error && typeof (error as any)._server_messages === 'string') {
        try {
          const messages = JSON.parse((error as any)._server_messages);
          const messageObj = JSON.parse(messages[0]);
          showToast.error(messageObj.message || 'API error');
        } catch {
          showToast.error('API error');
        }
      } else if (error instanceof Error) {
        showToast.error(error.message);
      } else {
        showToast.error(t('errors.failed_process_order'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const EmptyCartUI = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
        <FrownIcon className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('cart.empty_title')}
      </h3>

      <p className="text-muted-foreground text-sm mb-6 max-w-xs leading-relaxed">
        {t('cart.empty_subtitle')}
      </p>

      <div className="flex items-center gap-2 text-primary bg-primary/15 px-4 py-2 rounded-lg">
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">{t('cart.click_to_add')}</span>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {t('cart.double_click_hint')}
      </div>
    </div>
  );

  const LoadingOrderUI = () => (
    <div className="h-96">
      <Spinner message={t('cart.loading_order')} />
    </div>
  );

  const isInteractionDisabled = isOrderInteractionDisabled() || isSubmitting;

  return (
    <>
      {mobileCartOpen && (
        <button
          type="button"
          className="pos-order-panel-backdrop"
          aria-label={t('common.close')}
          onClick={() => setMobileCartOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setMobileCartOpen(true)}
        className={cn(
          'lg:hidden fixed end-4 bottom-[5.25rem] z-20 flex items-center gap-2 rounded-full',
          'bg-primary text-primary-foreground shadow-lg px-4 py-3 font-semibold text-sm'
        )}
        aria-label={t('cart.open_cart')}
      >
        <ShoppingCart className="w-5 h-5" />
        <span>{t('cart.title')}</span>
        {cartItemCount > 0 && (
          <span className="bg-primary-foreground text-primary rounded-full min-w-[1.25rem] h-5 px-1 text-xs flex items-center justify-center">
            {cartItemCount}
          </span>
        )}
      </button>

      <div
        className={cn(
          'pos-order-panel',
          mobileCartOpen ? 'flex' : 'hidden lg:flex'
        )}
      >
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2 lg:hidden">
          <span className="font-semibold text-foreground">{t('cart.title')}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileCartOpen(false)}
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <OrderTypeSelect disabled={isInteractionDisabled} />
        <div className="mt-3"><CustomerSelect disabled={isInteractionDisabled} /></div>
      </div>
      
      {orderLoading ? (
        <LoadingOrderUI />
      ) : activeOrders.length === 0 ? (
        <EmptyCartUI />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6">
            {activeOrders.map((item) => (
              <div
                key={item.uniqueId}
                className={cn(
                  "flex flex-col py-4 border-b border-border",
                  isInteractionDisabled && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
                    </div>
                    {item.selectedVariant && (
                      <p className="text-sm text-muted-foreground">{item.selectedVariant.name}</p>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {item.selectedAddons.map(addon => addon.name).join(', ')}
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm">{formatCurrency(calculateItemTotal(item))}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleEdit(item)}
                      variant="ghost"
                      size="icon"
                      className="text-primary hover:text-primary/80"
                      title={t('cart.edit_item')}
                      disabled={isInteractionDisabled}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          const newQuantity = Math.max(0, item.quantity - 1);
                          if (newQuantity === 0) {
                            removeFromOrder(item.uniqueId!);
                          } else {
                            updateQuantity(item.uniqueId!, newQuantity);
                          }
                        }}
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-full"
                        disabled={isInteractionDisabled}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button
                        onClick={() => updateQuantity(item.uniqueId!, item.quantity + 1)}
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-full"
                        disabled={isInteractionDisabled}
                      >
                        +
                      </Button>
                    </div>
                    
                    <Button
                      onClick={() => removeFromOrder(item.uniqueId!)}
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      disabled={isInteractionDisabled}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {activeOrders.length > 0 && (
              <Button
                onClick={clearOrder}
                variant="ghost"
                size="sm"
                className="w-full text-gray-600 hover:text-gray-800 mt-4"
                disabled={isInteractionDisabled}
              >
                {t('cart.clear_cart')}
              </Button>
            )}
          </div>
          
          <div className="p-4 border-t border-border flex-shrink-0 bg-card">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowCommentDialog(true)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    orderComment ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  disabled={isInteractionDisabled}
                  title={orderComment ? t('cart.edit_comment') : t('cart.add_comment')}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold">{t('cart.total')}</span>
              </div>
              <span className="text-lg font-semibold">{formatCurrency(total)}</span>
            </div>
            <Button
              onClick={handleSubmit}
              variant="default"
              size="default"
              className="w-full"
              disabled={isInteractionDisabled}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />

                  {isUpdatingOrder ? t('cart.updating_order') : t('cart.processing_order')}
                </div>
              ) : isUpdatingOrder ? (
                t('cart.update_order')
              ) : (
                t('cart.add_new_order')
              )}
            </Button>
          </div>
        </>
      )}

      {editingItem && (
        <ProductDialog
          onClose={() => {
            setEditingItem(null);
            setSelectedItem(null);
          }}
          editMode
          initialVariant={editingItem.selectedVariant}
          initialAddons={editingItem.selectedAddons}
          initialQuantity={editingItem.quantity}
          itemToReplace={editingItem}
        />
      )}

      <CommentDialog
        isOpen={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        onSave={handleCommentSave}
        initialComment={orderComment}
      />
    </div>
    </>
  );
};

export default OrderPanel; 