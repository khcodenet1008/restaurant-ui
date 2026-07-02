import type { MenuItem, OrderResponse } from "../api/client";

type OrdersPageProps = {
  menuItems: MenuItem[];
  recentOrders: OrderResponse[];
  updatingOrderIds: string[];
  orderIdLookup: string;
  orderLoading: boolean;
  orderMessage: string | null;
  orderError: string | null;
  onLookupChange: (value: string) => void;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onFetchOrder: () => void;
  onCancelOrder: (orderId: string) => void;
};

export function OrdersPage({
  menuItems,
  recentOrders,
  updatingOrderIds,
  orderIdLookup,
  orderLoading,
  orderMessage,
  orderError,
  onLookupChange,
  onCreate,
  onFetchOrder,
  onCancelOrder
}: OrdersPageProps) {
  function statusBadgeClass(status: string) {
    if (status === "COMPLETED") {
      return "status-up";
    }

    if (status === "CANCELLED" || status === "FAILED") {
      return "status-down";
    }

    return "status-loading";
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Orders</h2>
        <p>Create, fetch, and cancel orders through gateway-service.</p>
      </div>

      <div className="split-layout">
        <form className="panel" onSubmit={onCreate}>
          <h3>Create New Order</h3>
          <label>
            Customer Name
            <input name="customerName" placeholder="Student Demo User" required />
          </label>
          <label>
            Selected Menu Item
            <select name="menuItemId" required>
              <option value="">Choose a menu item</option>
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.currency} {Number(item.priceAmount).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input defaultValue={1} min={1} name="quantity" required type="number" />
          </label>
          <label>
            Notes Optional
            <textarea name="notes" placeholder="Only used as a UI note for students." rows={3} />
          </label>
          <button className="primary-button" disabled={orderLoading} type="submit">
            {orderLoading ? "Creating..." : "Create Order"}
          </button>
          <p className="helper-text">
            Order created. order-service should publish an <code>order.events</code> message.
          </p>
        </form>

        <div className="panel">
          <h3>Read or Cancel Order</h3>
          <label>
            Order ID
            <input
              onChange={(event) => onLookupChange(event.target.value)}
              placeholder="Paste an order ID"
              value={orderIdLookup}
            />
          </label>
          <div className="button-row">
            <button className="secondary-button" disabled={orderLoading || !orderIdLookup} onClick={onFetchOrder} type="button">
              Fetch Order
            </button>
            <button
              className="danger-button"
              disabled={orderLoading || !orderIdLookup}
              onClick={() => onCancelOrder(orderIdLookup)}
              type="button"
            >
              Cancel Order
            </button>
          </div>
          {orderMessage && <div className="state-panel success-panel">{orderMessage}</div>}
          {orderError && <div className="state-panel error-panel">{orderError}</div>}
        </div>
      </div>

      <div className="panel">
        <h3>Recent Orders</h3>
        <p className="muted-text">
          The backend does not provide a list-all orders endpoint. This table tracks orders created or fetched in this UI session.
        </p>
        {recentOrders.length === 0 ? (
          <div className="state-panel">No orders loaded yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customerId}</td>
                    <td>
                      {updatingOrderIds.includes(order.id) ? (
                        <div className="order-status-stack">
                          <span className="status-badge status-loading">UPDATING</span>
                          <span className="status-note">Stored: {order.status}</span>
                        </div>
                      ) : (
                        <span className={`status-badge ${statusBadgeClass(order.status)}`}>{order.status}</span>
                      )}
                    </td>
                    <td>
                      {order.currency} {Number(order.subtotalAmount).toFixed(2)}
                    </td>
                    <td>{order.items.map((item) => `${item.menuItemName} x${item.quantity}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
