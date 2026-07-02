import type { OrderResponse, PaymentResponse } from "../api/client";

type PaymentsPageProps = {
  recentOrders: OrderResponse[];
  paymentLoading: boolean;
  paymentResult: PaymentResponse | null;
  paymentMessage: string | null;
  paymentError: string | null;
  onConfirmPayment: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function PaymentsPage({
  recentOrders,
  paymentLoading,
  paymentResult,
  paymentMessage,
  paymentError,
  onConfirmPayment
}: PaymentsPageProps) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Payments</h2>
        <p>Mock payment confirmation through gateway-service and payment-service.</p>
      </div>

      <form className="panel" onSubmit={onConfirmPayment}>
        <h3>Mock Payment Confirmation</h3>
        <label>
          Select Known Order
          <select name="orderId">
            <option value="">Choose from recent orders or type manually below</option>
            {recentOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id} - {order.status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Or Enter Order ID Manually
          <input name="manualOrderId" placeholder="order-..." />
        </label>
        <label>
          Approved
          <select defaultValue="true" name="approved">
            <option value="true">Approved</option>
            <option value="false">Failed</option>
          </select>
        </label>
        <label>
          Failure Reason Optional
          <input name="failureReason" placeholder="Only for failed mock payment" />
        </label>
        <button className="primary-button" disabled={paymentLoading} type="submit">
          {paymentLoading ? "Confirming..." : "Confirm Mock Payment"}
        </button>
        <p className="helper-text">
          payment-service should publish <code>payment.events</code>, and order-service should update order status after consuming it.
        </p>
      </form>

      {paymentMessage && <div className="state-panel success-panel">{paymentMessage}</div>}
      {paymentError && <div className="state-panel error-panel">{paymentError}</div>}

      {paymentResult && (
        <div className="panel">
          <h3>Payment Result</h3>
          <div className="result-grid">
            <div><strong>Payment ID:</strong> {paymentResult.id}</div>
            <div><strong>Order ID:</strong> {paymentResult.orderId}</div>
            <div><strong>Status:</strong> {paymentResult.status}</div>
            <div><strong>Mock Result:</strong> {paymentResult.mockResult || "-"}</div>
            <div><strong>Amount:</strong> {paymentResult.currency} {Number(paymentResult.amount).toFixed(2)}</div>
            <div><strong>Failure Reason:</strong> {paymentResult.failureReason || "-"}</div>
          </div>
        </div>
      )}
    </section>
  );
}
