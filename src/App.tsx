import { useEffect, useState } from "react";
import {
  cancelOrder,
  checkGatewayHealth,
  confirmPayment,
  createOrder,
  demoMenuItems,
  endpoints,
  fetchMenuItems,
  frontendEnvVarName,
  gatewayBaseUrl,
  getOrder,
  type ApiResult,
  type MenuItem,
  type OrderResponse,
  type PaymentResponse,
  type ServiceStatus
} from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { DebugPanel } from "./components/DebugPanel";
import { DeploymentPage } from "./components/DeploymentPage";
import { EventFlowPage } from "./components/EventFlowPage";
import { MenuPage } from "./components/MenuPage";
import { OrdersPage } from "./components/OrdersPage";
import { PaymentsPage } from "./components/PaymentsPage";

const tabs = ["Dashboard", "Menu", "Orders", "Payments", "Event Flow", "Deployment", "Debug"] as const;

type Tab = (typeof tabs)[number];

function mergeOrder(order: OrderResponse, current: OrderResponse[]) {
  const rest = current.filter((item) => item.id !== order.id);
  return [order, ...rest];
}

function randomTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [usingDemoFallback, setUsingDemoFallback] = useState(false);
  const [menuResponse, setMenuResponse] = useState<ApiResult<MenuItem[]> | undefined>(undefined);

  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [orderIdLookup, setOrderIdLookup] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [healthStatus, setHealthStatus] = useState<ServiceStatus>("idle");
  const [healthResponse, setHealthResponse] = useState<ApiResult<unknown> | null>(null);

  async function loadMenu() {
    setMenuLoading(true);
    setMenuError(null);

    const result = await fetchMenuItems();
    setMenuResponse(result);

    if (result.ok && result.data) {
      setMenuItems(result.data);
      setUsingDemoFallback(false);
    } else {
      setMenuError(result.error || "Menu request failed");
      setMenuItems(demoMenuItems);
      setUsingDemoFallback(true);
    }

    setMenuLoading(false);
  }

  useEffect(() => {
    void loadMenu();
  }, []);

  async function handleCreateOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderLoading(true);
    setOrderMessage(null);
    setOrderError(null);

    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("customerName") || "").trim();
    const menuItemId = String(form.get("menuItemId") || "").trim();
    const quantity = Number(form.get("quantity") || 1);

    const menuItem = menuItems.find((item) => item.id === menuItemId) || demoMenuItems.find((item) => item.id === menuItemId);
    if (!menuItem) {
      setOrderError("Selected menu item was not found.");
      setOrderLoading(false);
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
      setRecentOrders((current) => mergeOrder(result.data!, current));
      setOrderIdLookup(result.data.id);
      setOrderMessage(`Order created successfully. Order ID: ${result.data.id}`);
      event.currentTarget.reset();
    } else {
      setOrderError(result.error || "Order creation failed.");
    }

    setOrderLoading(false);
  }

  async function handleFetchOrder() {
    if (!orderIdLookup.trim()) {
      return;
    }

    setOrderLoading(true);
    setOrderMessage(null);
    setOrderError(null);

    const result = await getOrder(orderIdLookup.trim());

    if (result.ok && result.data) {
      setRecentOrders((current) => mergeOrder(result.data!, current));
      setOrderMessage(`Order ${result.data.id} loaded successfully.`);
    } else {
      setOrderError(result.error || "Order fetch failed.");
    }

    setOrderLoading(false);
  }

  async function handleCancelOrder(orderId: string) {
    if (!orderId.trim()) {
      return;
    }

    setOrderLoading(true);
    setOrderMessage(null);
    setOrderError(null);

    const result = await cancelOrder(orderId.trim(), "Cancelled from frontend UI");

    if (result.ok && result.data) {
      setRecentOrders((current) => mergeOrder(result.data!, current));
      setOrderMessage(`Order ${result.data.id} cancelled.`);
    } else {
      setOrderError(result.error || "Order cancel failed.");
    }

    setOrderLoading(false);
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
      const refreshedOrder = await getOrder(order.id);
      if (refreshedOrder.ok && refreshedOrder.data) {
        setRecentOrders((current) => mergeOrder(refreshedOrder.data!, current));
      }
    } else {
      setPaymentError(result.error || "Payment confirmation failed.");
    }

    setPaymentLoading(false);
  }

  async function handleCheckHealth() {
    setHealthStatus("loading");
    const result = await checkGatewayHealth();
    setHealthResponse(result);
    setHealthStatus(result.ok ? "up" : "down");
  }

  const dashboardCards = [
    {
      name: "Gateway Service",
      purpose: "Public entry point",
      explanation: "Forwards client requests to menu, order, and payment routes.",
      status: healthStatus === "up" ? "up" : healthStatus === "down" ? "down" : "idle"
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
        <p className="eyebrow">Restaurant App Microservices UI</p>
        <h1>Simple Frontend for the 4-Service Restaurant System</h1>
        <p className="hero-copy">
          Client → gateway-service → menu, order, payment services → Kafka topics → GitOps and optional Istio.
        </p>
        <div className="hero-meta">
          <span>Gateway base URL: {gatewayBaseUrl}</span>
          <span>Menu route: {endpoints.menuItems}</span>
        </div>
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
            usingDemoFallback={usingDemoFallback}
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
          />
        )}
        {activeTab === "Event Flow" && <EventFlowPage />}
        {activeTab === "Deployment" && <DeploymentPage />}
        {activeTab === "Debug" && (
          <DebugPanel
            envVarName={frontendEnvVarName}
            gatewayBaseUrl={gatewayBaseUrl}
            healthResponse={healthResponse}
            healthStatus={healthStatus}
            onCheckHealth={() => void handleCheckHealth()}
          />
        )}
      </main>
    </div>
  );
}
