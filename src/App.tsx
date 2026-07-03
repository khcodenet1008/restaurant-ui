import { useEffect, useState } from "react";
import {
  cancelOrder,
  confirmPayment,
  createOrder,
  fetchMenuItems,
  getOrder,
  type ApiResult,
  type MenuItem,
  type OrderResponse,
  type PaymentResponse,
  type ServiceStatus
} from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { MenuPage } from "./components/MenuPage";
import { OrdersPage } from "./components/OrdersPage";
import { PaymentsPage } from "./components/PaymentsPage";

const tabs = ["Dashboard", "Menu", "Orders", "Payments"] as const;
const RECENT_ORDERS_STORAGE_KEY = "restaurant-ui-recent-orders";
const ORDER_LOOKUP_STORAGE_KEY = "restaurant-ui-order-id-lookup";

type Tab = (typeof tabs)[number];

function mergeOrder(order: OrderResponse, current: OrderResponse[]) {
  const rest = current.filter((item) => item.id !== order.id);
  return [order, ...rest];
}

function randomTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function loadStoredRecentOrders(): OrderResponse[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderResponse[]) : [];
  } catch {
    return [];
  }
}

function loadStoredOrderLookup(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ORDER_LOOKUP_STORAGE_KEY) || "";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuResponse, setMenuResponse] = useState<ApiResult<MenuItem[]> | undefined>(undefined);

  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>(() => loadStoredRecentOrders());
  const [orderIdLookup, setOrderIdLookup] = useState(() => loadStoredOrderLookup());
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<string[]>([]);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  async function loadMenu() {
    setMenuLoading(true);
    setMenuError(null);

    const result = await fetchMenuItems();
    setMenuResponse(result);

    if (result.ok && result.data) {
      setMenuItems(result.data);
    } else {
      setMenuError(result.error || "Menu request failed");
      setMenuItems([]);
    }

    setMenuLoading(false);
  }

  useEffect(() => {
    void loadMenu();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(recentOrders));
  }, [recentOrders]);

  useEffect(() => {
    window.localStorage.setItem(ORDER_LOOKUP_STORAGE_KEY, orderIdLookup);
  }, [orderIdLookup]);

  useEffect(() => {
    if (recentOrders.length === 0) {
      return;
    }

    let cancelled = false;

    async function refreshStoredOrders() {
      const refreshedOrders = await Promise.all(
        recentOrders.map(async (order) => {
          const result = await getOrder(order.id);
          return result.ok && result.data ? result.data : order;
        })
      );

      if (!cancelled) {
        setRecentOrders(refreshedOrders);
      }
    }

    void refreshStoredOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setOrderLoading(true);
    setOrderMessage(null);
    setOrderError(null);

    const form = new FormData(formElement);
    const customerName = String(form.get("customerName") || "").trim();
    const menuItemId = String(form.get("menuItemId") || "").trim();
    const quantity = Number(form.get("quantity") || 1);

    try {
      const menuItem = menuItems.find((item) => item.id === menuItemId);
      if (!menuItem) {
        setOrderError("Selected menu item was not found from the server menu.");
        return;
      }

      const result = await createOrder({
        customerId: customerName,
        paymentMethod: "MOCK_CARD",
        currency: menuItem.currency,
        items: [
          {
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            quantity,
            unitPriceAmount: Number(menuItem.priceAmount)
          }
        ]
      });

      if (result.ok && result.data) {
        const createdOrder = result.data;
        setRecentOrders((current) => mergeOrder(createdOrder, current));
        setOrderIdLookup(createdOrder.id);
        setOrderMessage(`Order created successfully. Order ID: ${createdOrder.id}`);
        formElement.reset();
      } else {
        setOrderError(result.error || "Order creation failed.");
      }
    } finally {
      setOrderLoading(false);
    }
  }

  async function handleFetchOrder() {
    if (!orderIdLookup.trim()) {
      return;
    }

    setOrderLoading(true);
    setOrderMessage(null);
    setOrderError(null);

    try {
      const result = await getOrder(orderIdLookup.trim());

      if (result.ok && result.data) {
        const loadedOrder = result.data;
        setRecentOrders((current) => mergeOrder(loadedOrder, current));
        setOrderMessage(`Order ${loadedOrder.id} loaded successfully.`);
      } else {
        setOrderError(result.error || "Order fetch failed.");
      }
    } finally {
      setOrderLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!orderId.trim()) {
      return;
    }

    setOrderLoading(true);
    setOrderMessage(null);
    setOrderError(null);

    try {
      const result = await cancelOrder(orderId.trim(), "Cancelled from frontend UI");

      if (result.ok && result.data) {
        const cancelledOrder = result.data;
        setRecentOrders((current) => mergeOrder(cancelledOrder, current));
        setOrderMessage(`Order ${cancelledOrder.id} cancelled.`);
      } else {
        setOrderError(result.error || "Order cancel failed.");
      }
    } finally {
      setOrderLoading(false);
    }
  }

  async function handleConfirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentLoading(true);
    setPaymentMessage(null);
    setPaymentError(null);

    const form = new FormData(event.currentTarget);
    const selectedOrderId = String(form.get("orderId") || "").trim();
    const manualOrderId = String(form.get("manualOrderId") || "").trim();
    const approved = String(form.get("approved") || "true") === "true";
    const failureReason = String(form.get("failureReason") || "").trim();
    const orderId = manualOrderId || selectedOrderId;

    const order = recentOrders.find((item) => item.id === orderId);

    if (!order) {
      setPaymentError("Choose or load an order before confirming payment.");
      setPaymentLoading(false);
      return;
    }

    try {
      const startingOrderStatus = order.status;
      const result = await confirmPayment({
        orderId: order.id,
        sagaId: order.sagaId,
        customerId: order.customerId,
        amount: Number(order.subtotalAmount),
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        traceId: randomTraceId(),
        approved,
        failureReason: approved ? "" : failureReason || "Mock payment failed"
      });

      if (result.ok && result.data) {
        setPaymentResult(result.data);
        setPaymentMessage(`Payment result received for order ${result.data.orderId}.`);
        setUpdatingOrderIds((current) => (current.includes(order.id) ? current : [...current, order.id]));

        let settled = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const refreshedOrder = await getOrder(order.id);
          if (refreshedOrder.ok && refreshedOrder.data) {
            const updatedOrder = refreshedOrder.data;
            setRecentOrders((current) => mergeOrder(updatedOrder, current));

            if (updatedOrder.status !== startingOrderStatus) {
              settled = true;
              break;
            }
          }

          if (attempt < 7) {
            await sleep(600);
          }
        }

        if (!settled) {
          setPaymentMessage(
            `Payment result received for order ${result.data.orderId}. order-service still reports ${startingOrderStatus} while Kafka processing continues.`
          );
        }
      } else {
        setPaymentError(result.error || "Payment confirmation failed.");
      }
    } finally {
      setUpdatingOrderIds((current) => current.filter((id) => id !== order.id));
      setPaymentLoading(false);
    }
  }

  const dashboardCards = [
    {
      name: "Gateway Service",
      purpose: "Public entry point",
      explanation: "Forwards client requests to menu, order, and payment routes.",
      status: "unknown"
    },
    {
      name: "Menu Service",
      purpose: "Read menu APIs",
      explanation: "Provides restaurant menu items for the UI and order form.",
      status: menuError ? "down" : menuItems.length > 0 ? "up" : "unknown"
    },
    {
      name: "Order Service",
      purpose: "Create and track orders",
      explanation: "Saves orders, publishes order.events, and reacts to payment.events.",
      status: recentOrders.length > 0 ? "up" : "unknown"
    },
    {
      name: "Payment Service",
      purpose: "Mock payment confirmation",
      explanation: "Confirms demo payments and publishes payment.events.",
      status: paymentResult ? "up" : "unknown"
    },
    {
      name: "MySQL",
      purpose: "Service-owned databases",
      explanation: "Stores restaurant_menu, restaurant_order, and restaurant_payment data.",
      status: "unknown"
    },
    {
      name: "Kafka",
      purpose: "Event transport",
      explanation: "Carries order.events, payment.events, and restaurant.dlq.",
      status: "unknown"
    },
    {
      name: "GitOps",
      purpose: "Deployment source of truth",
      explanation: "restaurant-gitops applies Kubernetes manifests for the four-service system.",
      status: "unknown"
    },
    {
      name: "Istio Optional",
      purpose: "Optional ingress and mesh layer",
      explanation: "Can expose the same four services through Istio ingress and traffic policy.",
      status: "unknown"
    }
  ] as const;

  return (
    <div className="app-shell">
      <header className="hero">
        <h1>Simple Frontend for the 4-Service Restaurant System</h1>
      </header>

      <nav className="top-nav">
        {tabs.map((tab) => (
          <button
            className={tab === activeTab ? "nav-tab active" : "nav-tab"}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === "Dashboard" && <Dashboard cards={dashboardCards as unknown as Array<{name: string; purpose: string; explanation: string; status: ServiceStatus}>} />}
        {activeTab === "Menu" && (
          <MenuPage
            error={menuError}
            items={menuItems}
            lastResponse={menuResponse}
            loading={menuLoading}
            onRefresh={() => void loadMenu()}
          />
        )}
        {activeTab === "Orders" && (
          <OrdersPage
            menuItems={menuItems}
            onCancelOrder={(id) => void handleCancelOrder(id)}
            onCreate={(event) => void handleCreateOrder(event)}
            onFetchOrder={() => void handleFetchOrder()}
            onLookupChange={setOrderIdLookup}
            orderError={orderError}
            orderIdLookup={orderIdLookup}
            orderLoading={orderLoading}
            orderMessage={orderMessage}
            recentOrders={recentOrders}
            updatingOrderIds={updatingOrderIds}
          />
        )}
        {activeTab === "Payments" && (
          <PaymentsPage
            onConfirmPayment={(event) => void handleConfirmPayment(event)}
            paymentError={paymentError}
            paymentLoading={paymentLoading}
            paymentMessage={paymentMessage}
            paymentResult={paymentResult}
            recentOrders={recentOrders}
            updatingOrderIds={updatingOrderIds}
          />
        )}
      </main>
    </div>
  );
}
