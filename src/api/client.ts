export const frontendServerBaseUrlEnvVarName = "VITE_GATEWAY_API_BASE_URL";

export const serverApiBaseUrl =
  import.meta.env[frontendServerBaseUrlEnvVarName]?.trim() || "";

export const endpoints = { // api endpoint
  menuItems: "/api/menu/items",
  createOrder: "/api/orders",
  getOrder: (orderId: string) => `/api/orders/${orderId}`,
  cancelOrder: (orderId: string) => `/api/orders/${orderId}/cancel`,
  confirmPayment: "/api/payments/mock-confirm",
  gatewayHealth: "/actuator/health"
};

export type ServiceStatus = "idle" | "loading" | "up" | "down" | "unknown";

export type MenuItem = {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  priceAmount: number;
  currency: string;
  imageUrl?: string;
  available: boolean;
  allergenLabels?: string | string[];
};

export type OrderItem = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount?: number;
  currency?: string;
};

export type OrderResponse = {
  id: string;
  customerId: string;
  sagaId: string;
  status: string;
  paymentMethod: string;
  subtotalAmount: number;
  currency: string;
  cancelReason?: string | null;
  createdAt?: string;
  items: OrderItem[];
};

export type PaymentResponse = {
  id: string;
  orderId: string;
  sagaId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  mockResult?: string | null;
  failureReason?: string | null;
  authorizedAt?: string | null;
};

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  raw?: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${serverApiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      ...init
    });

    const text = await response.text();
    const raw = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: readErrorMessage(raw, response.statusText),
        raw
      };
    }

    return {
      ok: true,
      status: response.status,
      data: raw as T,
      raw
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown network error"
    };
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readErrorMessage(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object") {
    const maybeMessage = (raw as Record<string, unknown>).message;
    const maybeError = (raw as Record<string, unknown>).error;

    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError;
    }
  }

  return fallback || "Request failed";
}

export async function fetchMenuItems(): Promise<ApiResult<MenuItem[]>> {
  return request<MenuItem[]>(endpoints.menuItems);
}

export async function createOrder(input: {
  customerId: string;
  paymentMethod: string;
  currency: string;
  items: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPriceAmount: number;
  }>;
}): Promise<ApiResult<OrderResponse>> {
  return request<OrderResponse>(endpoints.createOrder, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getOrder(orderId: string): Promise<ApiResult<OrderResponse>> {
  return request<OrderResponse>(endpoints.getOrder(orderId));
}

export async function cancelOrder(orderId: string, reason: string): Promise<ApiResult<OrderResponse>> {
  return request<OrderResponse>(endpoints.cancelOrder(orderId), {
    method: "PATCH",
    body: JSON.stringify({ reason })
  });
}

export async function confirmPayment(input: {
  orderId: string;
  sagaId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  traceId: string;
  approved: boolean;
  failureReason?: string;
}): Promise<ApiResult<PaymentResponse>> {
  return request<PaymentResponse>(endpoints.confirmPayment, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function checkGatewayHealth(): Promise<ApiResult<unknown>> {
  return request<unknown>(endpoints.gatewayHealth);
}
