import type { ServiceStatus } from "../api/client";

type CardItem = {
  name: string;
  purpose: string;
  explanation: string;
  status: ServiceStatus;
};

const statusLabel: Record<ServiceStatus, string> = {
  idle: "Not checked",
  loading: "Checking",
  up: "Up",
  down: "Down",
  unknown: "Unknown"
};

export function Dashboard({ cards }: { cards: CardItem[] }) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Dashboard</h2>
        <p>Simple overview of the restaurant system, infrastructure, and learning flow.</p>
      </div>
      <div className="card-grid">
        {cards.map((card) => (
          <article className="info-card" key={card.name}>
            <div className="card-topline">
              <h3>{card.name}</h3>
              <span className={`status-badge status-${card.status}`}>{statusLabel[card.status]}</span>
            </div>
            <p className="card-purpose">{card.purpose}</p>
            <p className="muted-text">{card.explanation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
