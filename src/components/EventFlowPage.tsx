const steps = [
  "1. Client creates order",
  "2. gateway-service forwards request",
  "3. order-service saves order",
  "4. order-service publishes order.events",
  "5. payment-service receives order event",
  "6. payment-service confirms mock payment",
  "7. payment-service publishes payment.events",
  "8. order-service receives payment event",
  "9. order status is updated"
];

export function EventFlowPage() {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Event Flow</h2>
        <p>Simple classroom view of the request flow and Kafka event chain.</p>
      </div>

      <div className="timeline">
        {steps.map((step, index) => (
          <div className="timeline-step" key={step}>
            <div className="timeline-box">{step}</div>
            {index < steps.length - 1 && <div className="timeline-arrow">↓</div>}
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Kafka Topics</h3>
        <div className="topic-list">
          <span className="topic-pill">order.events</span>
          <span className="topic-pill">payment.events</span>
          <span className="topic-pill">restaurant.dlq</span>
        </div>
        <p className="muted-text">Failed or problematic events can be sent here for debugging.</p>
      </div>
    </section>
  );
}
