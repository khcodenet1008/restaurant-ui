import type { ApiResult, MenuItem } from "../api/client";

type MenuPageProps = {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  usingDemoFallback: boolean;
  onRefresh: () => void;
  lastResponse?: ApiResult<MenuItem[]>;
};

export function MenuPage({
  items,
  loading,
  error,
  usingDemoFallback,
  onRefresh
}: MenuPageProps) {
  return (
    <section className="page-section">
      <div className="section-heading section-row">
        <div>
          <h2>Menu</h2>
          <p>Read-only menu page powered by the gateway route to menu-service.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} type="button">
          Refresh Menu
        </button>
      </div>

      {loading && <div className="state-panel">Loading menu items from gateway-service...</div>}

      {!loading && error && (
        <div className="state-panel error-panel">
          <strong>Menu request failed.</strong>
          <p>{error}</p>
          <p className="muted-text">
            Demo fallback data is shown below so students can still understand the system shape.
          </p>
        </div>
      )}

      {!loading && usingDemoFallback && (
        <div className="state-panel warning-panel">
          Demo fallback data is currently shown. Real API data was unavailable.
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="state-panel">No menu items are available right now.</div>
      )}

      <div className="menu-grid">
        {items.map((item) => (
          <article className="menu-card" key={item.id}>
            <div className="card-topline">
              <h3>{item.name}</h3>
              <span className={`availability ${item.available ? "available" : "unavailable"}`}>
                {item.available ? "Available" : "Unavailable"}
              </span>
            </div>
            <p>{item.description || "No description provided."}</p>
            <p className="price-line">
              {item.currency} {Number(item.priceAmount).toFixed(2)}
            </p>
            <div className="item-meta">
              <span>ID: {item.id}</span>
              {item.categoryId && <span>Category: {item.categoryId}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
