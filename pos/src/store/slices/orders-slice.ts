import { StateCreator } from 'zustand';
import { OrderStatusType, OrderType } from '../../data/order-types';
import { call } from '../../lib/frappe-sdk';
import { getPOSInvoices, getPOSInvoiceItems, POSInvoiceItem, POSInvoiceTax } from '../../lib/invoice-api';
import { searchPosInvoice } from '../../lib/invoice-api';

export interface POSInvoice {
  name: string;
  invoice_printed: number;
  grand_total: number;
  restaurant_table: string | null;
  cashier: string;
  waiter: string;
  net_total: number;
  posting_time: string;
  total_taxes_and_charges: number;
  customer: string;
  status: 'Draft' | 'Unbilled' | 'Recently Paid' | 'Paid' | 'Consolidated' | 'Return';
  mobile_number: string;
  posting_date: string;
  rounded_total: number;
  order_type: OrderType;
}

export interface OrdersState {
  orders: POSInvoice[];
  orderLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    hasNextPage: boolean;
    itemsPerPage: number;
  };
  selectedStatus: 'Draft' | 'Unbilled' | 'Recently Paid' | 'Paid' | 'Consolidated' | 'Return';
  selectedOrder: POSInvoice | null;
  selectedOrderItems: POSInvoiceItem[];
  selectedOrderTaxes: POSInvoiceTax[];
  selectedOrderLoading: boolean;
  selectedOrderError: string | null;
  orderSearchQuery: string;
}

export interface OrdersActions {
  fetchOrders: (page?: number) => Promise<void>;
  updateOrderStatus: (orderId: string, status: POSInvoice['status']) => Promise<void>;
  goToNextPage: () => Promise<void>;
  goToPreviousPage: () => Promise<void>;
  setSelectedStatus: (status: POSInvoice['status']) => Promise<void>;
  selectOrder: (order: POSInvoice) => Promise<void>;
  clearSelectedOrder: () => void;
  setOrderSearchQuery: (query: string) => void;
  followOrderInStatusTab: (
    invoiceName: string,
    targetStatus: OrderStatusType
  ) => Promise<void>;
}

export type OrdersSlice = OrdersState & OrdersActions;

const ITEMS_PER_PAGE = 10;

function minimalPaidInvoice(
  name: string,
  existing?: Partial<POSInvoice> | null
): POSInvoice {
  return {
    name,
    invoice_printed: existing?.invoice_printed ?? 1,
    grand_total: existing?.grand_total ?? 0,
    restaurant_table: existing?.restaurant_table ?? null,
    cashier: existing?.cashier ?? '',
    waiter: existing?.waiter ?? '',
    net_total: existing?.net_total ?? 0,
    posting_time: existing?.posting_time ?? '',
    total_taxes_and_charges: existing?.total_taxes_and_charges ?? 0,
    customer: existing?.customer ?? '',
    status: 'Paid',
    mobile_number: existing?.mobile_number ?? '',
    posting_date: existing?.posting_date ?? '',
    rounded_total: existing?.rounded_total ?? 0,
    order_type: (existing?.order_type ?? 'Take Away') as OrderType,
  };
}

function invoiceFromSearchHit(hit: Record<string, unknown>): POSInvoice {
  return minimalPaidInvoice(String(hit.name), hit as Partial<POSInvoice>);
}

export const createOrdersSlice: StateCreator<
  OrdersSlice,
  [],
  [],
  OrdersSlice
> = (set, get) => ({
  // Initial state
  orders: [],
  orderLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    hasNextPage: false,
    itemsPerPage: ITEMS_PER_PAGE,
  },
  selectedStatus: 'Draft',
  selectedOrder: null,
  selectedOrderItems: [],
  selectedOrderTaxes: [],
  selectedOrderLoading: false,
  selectedOrderError: null,
  orderSearchQuery: '',

  // Actions
  fetchOrders: async (page = 1) => {
    try {
      set({ orderLoading: true, error: null });
      const { orderSearchQuery, selectedStatus, selectedOrder } = get();
      const selectedId = selectedOrder?.name;

      const syncSelectedOrder = (orders: POSInvoice[]) => {
        if (!selectedId) return {};
        const match = orders.find((order) => order.name === selectedId);
        return match ? { selectedOrder: match } : {};
      };

      // Get POS profile to access paid_limit
      const posProfile = sessionStorage.getItem('posProfile');
      const profile = posProfile ? JSON.parse(posProfile) : null;
      const paidLimit = profile?.paid_limit;
      
      if (orderSearchQuery && orderSearchQuery.trim()) {
        // Use search API
        const res = await searchPosInvoice(orderSearchQuery, selectedStatus);
        const orders = res.data || [];
        set({
          orders,
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            itemsPerPage: ITEMS_PER_PAGE,
          },
          orderLoading: false,
          ...syncSelectedOrder(orders),
        });
        return;
      }
      // Default fetch
      const limitStart = (page - 1) * ITEMS_PER_PAGE;
      const status = selectedStatus;
      const { invoices, hasMore } = await getPOSInvoices({
        status,
        limit: ITEMS_PER_PAGE,
        limit_start: limitStart,
        paid_limit: paidLimit
      });
      set({ 
        orders: invoices,
        pagination: {
          currentPage: page,
          hasNextPage: hasMore,
          itemsPerPage: ITEMS_PER_PAGE,
        },
        orderLoading: false,
        ...syncSelectedOrder(invoices),
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        orderLoading: false 
      });
    }
  },

  goToNextPage: async () => {
    const { pagination, orderLoading } = get();
    if (!orderLoading && pagination.hasNextPage) {
      await get().fetchOrders(pagination.currentPage + 1);
    }
  },

  goToPreviousPage: async () => {
    const { pagination, orderLoading } = get();
    if (!orderLoading && pagination.currentPage > 1) {
      await get().fetchOrders(pagination.currentPage - 1);
    }
  },

  setSelectedStatus: async (status) => {
    set({ selectedStatus: status });
    // Clear selected order when status changes
    get().clearSelectedOrder();
    await get().fetchOrders(1); // Reset to first page when status changes
  },

  selectOrder: async (order) => {
    try {
      set({ 
        selectedOrder: order,
        selectedOrderLoading: true, 
        selectedOrderError: null 
      });

      const { items, taxes } = await getPOSInvoiceItems(order.name);
      
      set({ 
        selectedOrderItems: items,
        selectedOrderTaxes: taxes,
        selectedOrderLoading: false 
      });
    } catch (error) {
      set({ 
        selectedOrderError: error instanceof Error ? error.message : 'Failed to fetch order details',
        selectedOrderLoading: false 
      });
    }
  },

  clearSelectedOrder: () => {
    set({ 
      selectedOrder: null,
      selectedOrderItems: [],
      selectedOrderTaxes: [],
      selectedOrderError: null 
    });
  },

  updateOrderStatus: async (orderId: string, status: POSInvoice['status']) => {
    try {
      set({ orderLoading: true, error: null });

      await call.post('ury.ury_pos.api.updatePosInvoiceStatus', {
        invoice: orderId,
        status,
      });

      // Refresh the orders list after status update
      await get().fetchOrders(get().pagination.currentPage);
      
      set({ orderLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update order status',
        orderLoading: false 
      });
    }
  },

  setOrderSearchQuery: (query) => set({ orderSearchQuery: query }),

  followOrderInStatusTab: async (invoiceName, targetStatus) => {
    const prior =
      get().selectedOrder?.name === invoiceName ? get().selectedOrder : null;

    try {
      set({
        selectedStatus: targetStatus,
        orderLoading: true,
        error: null,
        orderSearchQuery: '',
        pagination: {
          currentPage: 1,
          hasNextPage: false,
          itemsPerPage: ITEMS_PER_PAGE,
        },
      });

      const posProfile = sessionStorage.getItem('posProfile');
      const profile = posProfile ? JSON.parse(posProfile) : null;
      const paidLimit = profile?.paid_limit;

      const { invoices, hasMore } = await getPOSInvoices({
        status: targetStatus,
        limit: ITEMS_PER_PAGE,
        limit_start: 0,
        paid_limit: paidLimit,
      });

      let match = invoices.find((order) => order.name === invoiceName);
      let orders = invoices;

      if (!match) {
        try {
          const res = await searchPosInvoice(invoiceName, targetStatus);
          const hits = (res.data || []) as Record<string, unknown>[];
          const searchMatch = hits.find((hit) => hit.name === invoiceName);
          if (searchMatch) {
            match = invoiceFromSearchHit(searchMatch);
            orders = [
              match,
              ...invoices.filter((order) => order.name !== invoiceName),
            ];
          }
        } catch {
          /* search is best-effort */
        }
      }

      set({
        orders,
        pagination: {
          currentPage: 1,
          hasNextPage: hasMore,
          itemsPerPage: ITEMS_PER_PAGE,
        },
        orderLoading: false,
      });

      await get().selectOrder(match ?? minimalPaidInvoice(invoiceName, prior));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load orders',
        orderLoading: false,
      });
      await get().selectOrder(minimalPaidInvoice(invoiceName, prior));
    }
  },
}); 