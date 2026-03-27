import { startTransition, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Item, ItemAuditEvent, StockMovement } from "@opsly/shared";
import { fetchItemById, fetchItemMovements, fetchItemAudit } from "./api";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      item: Item;
      movements: StockMovement[];
      auditEvents: ItemAuditEvent[];
    }
  | { status: "not-found"; message?: undefined }
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

export function ItemDetail() {
  const navigate = useNavigate();
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!itemId) {
      setState({ status: "not-found" });
      return;
    }

    const fetchId = itemId; // Capture in local scope to guarantee it's a string
    let isActive = true;

    async function load() {
      try {
        const [item, movements, auditResponse] = await Promise.all([
          fetchItemById(fetchId),
          fetchItemMovements(fetchId),
          fetchItemAudit(fetchId, 50),
        ]);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            status: "ready",
            item,
            movements,
            auditEvents: auditResponse.events,
          });
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error && error.message.includes("404")
            ? "Item not found"
            : error instanceof Error
              ? error.message
              : "Failed to load item details.";

        startTransition(() => {
          if (message === "Item not found") {
            setState({ status: "not-found" });
          } else {
            setState({ status: "error", message });
          }
        });
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [itemId]);

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <main className="app-layout">
        <header className="hero-panel">
          <div>
            <button
              className="back-link"
              onClick={() => navigate("/")}
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                paddingBottom: "0.5rem",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              ← Back to dashboard
            </button>
            <p className="eyebrow">Item Details</p>
            {state.status === "ready" ? (
              <>
                <h1>{state.item.name}</h1>
                <p className="hero-copy">
                  SKU: <strong>{state.item.sku}</strong>
                </p>
              </>
            ) : null}
          </div>
        </header>

        {state.status === "loading" ? (
          <section className="status-panel">
            <h2>Loading item details</h2>
            <p>Fetching item information, stock movements, and audit history.</p>
          </section>
        ) : null}

        {state.status === "not-found" ? (
          <section className="status-panel status-panel-error">
            <h2>Item not found</h2>
            <p>The item you are looking for does not exist or is not accessible.</p>
          </section>
        ) : null}

        {state.status === "error" ? (
          <section className="status-panel status-panel-error">
            <h2>Error loading item</h2>
            <p>{state.message}</p>
          </section>
        ) : null}

        {state.status === "ready" ? (
          <section className="dashboard-grid">
            <article className="panel panel-wide">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Current position</p>
                  <h2>Stock snapshot</h2>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>On hand</span>
                  <strong style={{ fontSize: "1.5rem" }}>
                    {formatNumber(state.item.quantityOnHand)}
                  </strong>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    {state.item.unit}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Reorder threshold</span>
                  <strong style={{ fontSize: "1.5rem" }}>
                    {state.item.reorderThreshold === undefined
                      ? "-"
                      : formatNumber(state.item.reorderThreshold)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Total movements</span>
                  <strong style={{ fontSize: "1.5rem" }}>
                    {formatNumber(state.movements.length)}
                  </strong>
                </div>
              </div>
            </article>

            {state.movements.length > 0 ? (
              <article className="panel panel-wide">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Movement history</p>
                    <h2>Stock adjustments, receipts, and picks</h2>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Delta</th>
                        <th>Before</th>
                        <th>After</th>
                        <th>Details</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.movements.map((movement) => (
                        <tr key={movement.id}>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                backgroundColor:
                                  movement.type === "RECEIPT"
                                    ? "#d4edda"
                                    : movement.type === "PICK"
                                      ? "#f8d7da"
                                      : "#e2e3e5",
                                color:
                                  movement.type === "RECEIPT"
                                    ? "#155724"
                                    : movement.type === "PICK"
                                      ? "#721c24"
                                      : "#383d41",
                              }}
                            >
                              {movement.type}
                            </span>
                          </td>
                          <td>
                            <strong
                              style={{
                                color:
                                  movement.delta > 0
                                    ? "#28a745"
                                    : movement.delta < 0
                                      ? "#dc3545"
                                      : "#6c757d",
                              }}
                            >
                              {movement.delta > 0 ? "+" : ""}
                              {formatNumber(movement.delta)}
                            </strong>
                          </td>
                          <td>{formatNumber(movement.quantityBefore)}</td>
                          <td>{formatNumber(movement.quantityAfter)}</td>
                          <td>
                            <div style={{ fontSize: "0.85rem" }}>
                              {movement.reasonCode && <p>{movement.reasonCode}</p>}
                              {movement.note && <p style={{ color: "#666" }}>{movement.note}</p>}
                              {movement.orderReference && (
                                <p style={{ color: "#666" }}>Order: {movement.orderReference}</p>
                              )}
                              {movement.supplierReference && (
                                <p style={{ color: "#666" }}>
                                  Supplier: {movement.supplierReference}
                                </p>
                              )}
                              {movement.performedBy && (
                                <p style={{ color: "#666", marginTop: "0.25rem" }}>
                                  — {movement.performedBy}
                                </p>
                              )}
                            </div>
                          </td>
                          <td>{formatDateTime(movement.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}

            {state.auditEvents.length > 0 ? (
              <article className="panel panel-wide">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Audit timeline</p>
                    <h2>All system events for this item</h2>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {state.auditEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        padding: "1rem",
                        borderLeft: "3px solid #ddd",
                        borderRadius: "4px",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                            {event.eventType === "STOCK_MODIFIED"
                              ? `Stock modified`
                              : event.eventType === "REORDER_THRESHOLD_UPDATED"
                                ? "Reorder threshold updated"
                                : "Item created"}
                          </strong>
                          {event.eventType === "STOCK_MODIFIED" && (
                            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
                              Delta:{" "}
                              <strong
                                style={{
                                  color:
                                    event.delta && event.delta > 0
                                      ? "#28a745"
                                      : event.delta && event.delta < 0
                                        ? "#dc3545"
                                        : "#6c757d",
                                }}
                              >
                                {event.delta && event.delta > 0 ? "+" : ""}
                                {event.delta !== undefined ? formatNumber(event.delta) : "0"}
                              </strong>
                              {" from "}
                              {event.quantityBefore !== undefined
                                ? formatNumber(event.quantityBefore)
                                : "?"}{" "}
                              to{" "}
                              {event.quantityAfter !== undefined
                                ? formatNumber(event.quantityAfter)
                                : "?"}
                            </p>
                          )}
                          {event.reasonCode && (
                            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#666" }}>
                              Reason: <strong>{event.reasonCode}</strong>
                            </p>
                          )}
                          {event.note && (
                            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#666" }}>
                              Note: {event.note}
                            </p>
                          )}
                          {event.performedBy && (
                            <p
                              style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "#999" }}
                            >
                              By {event.performedBy}
                            </p>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "#999",
                            whiteSpace: "nowrap",
                            marginLeft: "1rem",
                          }}
                        >
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
