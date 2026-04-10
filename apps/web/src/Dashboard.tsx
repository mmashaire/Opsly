import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  InventoryInvestigationSummary,
  Item,
  OperationsDashboardSummary,
} from "@opsly/shared";
import {
  fetchDashboardSummary,
  fetchInvestigationSummary,
  fetchItems,
  fetchLowStockItems,
  getApiBaseUrl,
  getConfiguredAuthMode,
} from "./api";

interface AppData {
  dashboard: OperationsDashboardSummary;
  lowStockItems: Item[];
  items: Item[];
  investigation: InventoryInvestigationSummary;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: AppData }
  | { status: "error"; message: string };

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function Dashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        const [dashboard, lowStockItems, items, investigation] = await Promise.all([
          fetchDashboardSummary(),
          fetchLowStockItems(),
          fetchItems(),
          fetchInvestigationSummary(),
        ]);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            status: "ready",
            data: {
              dashboard,
              lowStockItems,
              items,
              investigation,
            },
          });
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load Opsly dashboard.";

        startTransition(() => {
          setState({ status: "error", message });
        });
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const authMode = getConfiguredAuthMode();
  const apiBaseUrl = getApiBaseUrl();

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <main className="app-layout">
        <header className="hero-panel">
          <div>
            <p className="eyebrow">Warehouse Operations Console</p>
            <h1>Opsly surfaces the signals a shift lead actually needs.</h1>
            <p className="hero-copy">
              This dashboard is wired to the live API surface: inventory health, low-stock pressure,
              and adjustment-driven mismatch risk.
            </p>
          </div>
          <div className="hero-meta-grid">
            <div className="hero-meta-card">
              <span className="hero-meta-label">API base URL</span>
              <strong>{apiBaseUrl}</strong>
            </div>
            <div className="hero-meta-card">
              <span className="hero-meta-label">Frontend auth mode</span>
              <strong>{authMode}</strong>
            </div>
          </div>
        </header>

        {state.status === "loading" ? (
          <section className="status-panel">
            <h2>Loading operational data</h2>
            <p>
              Requesting dashboard summary, item inventory, low-stock alerts, and investigation
              candidates.
            </p>
          </section>
        ) : null}

        {state.status === "error" ? (
          <section className="status-panel status-panel-error">
            <h2>Dashboard unavailable</h2>
            <p>{state.message}</p>
            <p>
              For local demo mode, set <code>VITE_API_ROLE=admin</code> in{" "}
              <code>apps/web/.env</code>
              and allow <code>http://localhost:5173</code> in the API via{" "}
              <code>OPSLY_ALLOWED_ORIGINS</code>. For bearer-token mode, set{" "}
              <code>VITE_API_TOKEN</code> and configure matching API tokens in{" "}
              <code>apps/api/.env</code>.
            </p>
          </section>
        ) : null}

        {state.status === "ready" ? (
          <>
            {state.data.dashboard.inventory.totalItems === 0 ? (
              <section className="status-panel">
                <h2>No warehouse activity loaded yet</h2>
                <p>
                  Opsly is connected to the live API, but the current environment has no inventory
                  records yet.
                </p>
                <p>
                  For a realistic local walkthrough, set <code>OPSLY_SEED_DEMO_DATA=true</code> in{" "}
                  <code>apps/api/.env</code> and restart the API. That will load demo inventory,
                  receipts, picks, low-stock pressure, and investigation candidates.
                </p>
                <p>
                  If you want a clean environment instead, leave seeding disabled and create items
                  through the API first.
                </p>
              </section>
            ) : null}

            <section className="metrics-grid">
              <MetricCard
                label="Tracked items"
                value={formatNumber(state.data.dashboard.inventory.totalItems)}
                accent="steel"
              />
              <MetricCard
                label="Units on hand"
                value={formatNumber(state.data.dashboard.inventory.totalQuantityOnHand)}
                accent="teal"
              />
              <MetricCard
                label="Low-stock items"
                value={formatNumber(state.data.dashboard.inventory.lowStockItemCount)}
                accent="amber"
              />
              <MetricCard
                label="Investigation candidates"
                value={formatNumber(state.data.dashboard.investigation.candidateItemCount)}
                accent="red"
              />
            </section>

            <section className="dashboard-grid">
              <article className="panel panel-wide">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Operational pulse</p>
                    <h2>7-day movement summary</h2>
                  </div>
                  <span className="panel-timestamp">
                    Generated {formatDateTime(state.data.dashboard.generatedAt)}
                  </span>
                </div>
                <div className="activity-grid">
                  <ActivityStat
                    label="Receipts"
                    value={formatNumber(state.data.dashboard.activity.receiptMovementCount)}
                    detail={`${formatNumber(state.data.dashboard.activity.unitsReceived)} units received`}
                  />
                  <ActivityStat
                    label="Picks"
                    value={formatNumber(state.data.dashboard.activity.pickMovementCount)}
                    detail={`${formatNumber(state.data.dashboard.activity.unitsPicked)} units picked`}
                  />
                  <ActivityStat
                    label="Adjustments"
                    value={formatNumber(state.data.dashboard.activity.adjustmentMovementCount)}
                    detail={`Net stock change ${formatNumber(state.data.dashboard.activity.netStockChange)}`}
                  />
                  <ActivityStat
                    label="Out of stock"
                    value={formatNumber(state.data.dashboard.inventory.outOfStockItemCount)}
                    detail="Items currently at zero on hand"
                  />
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Immediate attention</p>
                    <h2>Low-stock watchlist</h2>
                  </div>
                </div>
                <div className="compact-list">
                  {state.data.lowStockItems.length === 0 ? (
                    <p className="empty-copy">
                      {state.data.dashboard.inventory.totalItems === 0
                        ? "No inventory has been loaded yet. Seed demo data or create items to populate this watchlist."
                        : "No low-stock items right now."}
                    </p>
                  ) : (
                    state.data.lowStockItems.slice(0, 6).map((item) => (
                      <button
                        className="compact-row compact-row-button"
                        key={item.id}
                        onClick={() => navigate(`/items/${encodeURIComponent(item.id)}`)}
                        type="button"
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.sku}</span>
                        </div>
                        <div className="compact-row-metric">
                          <strong>{formatNumber(item.quantityOnHand)}</strong>
                          <span>threshold {formatNumber(item.reorderThreshold ?? 0)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="panel panel-wide">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Inventory risk</p>
                    <h2>Mismatch investigation candidates</h2>
                  </div>
                </div>
                {state.data.investigation.items.length === 0 ? (
                  <p className="empty-copy">
                    {state.data.dashboard.inventory.totalItems === 0
                      ? "No inventory movements are loaded yet, so there are no mismatch candidates to review."
                      : "No items crossed the current investigation threshold."}
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>On hand</th>
                          <th>Adjustments</th>
                          <th>Negative</th>
                          <th>Score</th>
                          <th>Latest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.data.investigation.items.slice(0, 6).map((item) => (
                          <tr
                            key={item.itemId}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/items/${encodeURIComponent(item.itemId)}`)}
                          >
                            <td>
                              <strong>{item.name}</strong>
                              <div className="table-subtle">{item.sku}</div>
                            </td>
                            <td>{formatNumber(item.currentQuantityOnHand)}</td>
                            <td>{formatNumber(item.adjustmentCount)}</td>
                            <td>{formatNumber(item.negativeAdjustmentCount)}</td>
                            <td>{formatNumber(item.investigationScore)}</td>
                            <td>{formatDateTime(item.latestAdjustmentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="panel panel-wide">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Inventory register</p>
                    <h2>Current item positions</h2>
                  </div>
                </div>
                {state.data.items.length === 0 ? (
                  <p className="empty-copy">
                    No items exist yet. Enable demo seeding in <code>apps/api/.env</code> or add
                    inventory records through the API to populate the register.
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Name</th>
                          <th>Unit</th>
                          <th>On hand</th>
                          <th>Reorder threshold</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.data.items.map((item) => (
                          <tr
                            key={item.id}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/items/${encodeURIComponent(item.id)}`)}
                          >
                            <td>{item.sku}</td>
                            <td>{item.name}</td>
                            <td>{item.unit}</td>
                            <td>{formatNumber(item.quantityOnHand)}</td>
                            <td>
                              {item.reorderThreshold === undefined
                                ? "-"
                                : formatNumber(item.reorderThreshold)}
                            </td>
                            <td>{formatDateTime(item.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; accent: string }) {
  return (
    <article className={`metric-card metric-card-${props.accent}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function ActivityStat(props: { label: string; value: string; detail: string }) {
  return (
    <div className="activity-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </div>
  );
}
