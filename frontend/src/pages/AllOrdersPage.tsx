import { useEffect, useState, Fragment, type CSSProperties } from "react";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { Order, Product } from "../types";
import { OrderType } from "../types";
import { Badge } from "../components/Badge";

type StatusFilter   = "all" | "pending" | "completed";
type ProposalFilter = "all" | "special" | "noSpecial";

export function AllOrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>("all");
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([ordersApi.getAll(), productsApi.getAll(), warehousesApi.getAll()])
      .then(([o, p]) => { setOrders(o || []); setProducts(p || []); })
      .catch(() => setError("Nepavyko įkelti užsakymų"))
      .finally(() => setLoading(false));
  }, []);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReserve = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Rezervuoti medžiagas užsakymui #${order.id.slice(0, 8)}…? Bus sumažinti sandėlio kiekiai.`)) return;
    setReservingId(order.id);
    setReserveError(null);
    try {
      await ordersApi.reserve(order.id);
      setOrders((prev) => prev.map((o) =>
        o.id === order.id ? { ...o, status: "COMPLETED" } : o
      ));
    } catch {
      setReserveError("Nepavyko rezervuoti medžiagų. Bandykite dar kartą.");
    } finally {
      setReservingId(null);
    }
  };
  const statusVariant = (status: string | null): "green" | "yellow" | "blue" | "gray" => {
    if (!status) return "gray";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "green";
    if (s.includes("pend")) return "yellow";
    return "blue";
  };

  const statusLabel = (status: string | null) => {
    if (!status) return "Nežinoma";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "Užbaigtas";
    if (s.includes("pend")) return "Laukiami";
    return status;
  };

  const proposalLabel = (orderType: OrderType | null) => {
    if (orderType === OrderType.SpecialOffer)   return "Specialus";
    if (orderType === OrderType.NoSpecialOffer) return "Standartinis";
    return "—";
  };

  const proposalVariant = (orderType: OrderType | null): "blue" | "gray" => {
    if (orderType === OrderType.SpecialOffer) return "blue";
    return "gray";
  };
  const filtered = orders.filter((o) => {
    const s = o.status?.toLowerCase() ?? "";
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "pending"   && s.includes("pend")) ||
      (statusFilter === "completed" && s.includes("complete"));

    const matchProposal =
      proposalFilter === "all" ||
      (proposalFilter === "special"   && o.orderType === OrderType.SpecialOffer) ||
      (proposalFilter === "noSpecial" && (o.orderType === OrderType.NoSpecialOffer || o.orderType == null));

    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.user?.name?.toLowerCase().includes(q) ||
      o.user?.email?.toLowerCase().includes(q) ||
      o.user?.companyCode?.toLowerCase().includes(q) ||
      o.user?.phone?.toLowerCase().includes(q);

    return matchStatus && matchProposal && matchSearch;
  });

  const pendingCount   = orders.filter((o) => o.status?.toLowerCase().includes("pend")).length;
  const completedCount = orders.filter((o) => o.status?.toLowerCase().includes("complete")).length;
  const specialCount   = orders.filter((o) => o.orderType === OrderType.SpecialOffer).length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Užsakymų sąrašas</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <SummaryCard label="Visi užsakymai"   value={orders.length}  color="var(--brand)" />
        <SummaryCard label="Laukiami"         value={pendingCount}   color="#d97706" />
        <SummaryCard label="Užbaigti"         value={completedCount} color="var(--success)" />
        <SummaryCard label="Specialūs pasiūlymai" value={specialCount} color="#6366f1" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Ieškoti pagal vardą, el. paštą, įm. kodą…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "completed"] as StatusFilter[]).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`btn btn-sm ${statusFilter === f ? "btn-primary" : "btn-secondary"}`}>
              {f === "all" ? "Visi" : f === "pending" ? "Laukiami" : "Užbaigti"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, borderLeft: "1px solid var(--border)", paddingLeft: 10 }}>
          {(["all", "special", "noSpecial"] as ProposalFilter[]).map((f) => (
            <button key={f} onClick={() => setProposalFilter(f)}
              className={`btn btn-sm ${proposalFilter === f ? "btn-primary" : "btn-secondary"}`}>
              {f === "all" ? "Visi pasiūlymai" : f === "special" ? "Specialus" : "Standartinis"}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>
          {filtered.length} iš {orders.length}
        </span>
      </div>

      {error      && <div className="alert alert-error"   style={{ marginBottom: 14 }}>⚠ {error}</div>}
      {reserveError && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {reserveError}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)", fontSize: 14 }}>Kraunama…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: "48px 0", color: "var(--text-3)", fontSize: 14 }}>
            {search || statusFilter !== "all" || proposalFilter !== "all"
              ? "Pagal paieškos kriterijus užsakymų nerasta"
              : "Užsakymų dar nėra"}
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 55 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--border)" }}>
                <th style={th()}></th>
                <th style={th()}>Data</th>
                <th style={th()}>Klientas</th>
                <th style={th()}>El. paštas / Tel.</th>
                <th style={th()}>Statusas</th>
                <th style={th()}>Pasiūlymas</th>
                <th style={th("center")}>Prekės</th>
                <th style={th("right")}>Suma</th>
                <th style={th("center")}>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const expanded  = expandedIds.has(order.id);
                const itemCount = order.items?.length ?? 0;
                const isCompleted = order.status?.toLowerCase().includes("complete");
                const total = order.items?.reduce((sum, item) => {
                  const price = productMap[item.productId]?.price ?? 0;
                  return sum + price * item.quantity;
                }, 0) ?? 0;

                return (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => toggleExpand(order.id)}
                      style={{
                        borderBottom: expanded ? "none" : "1px solid var(--border)",
                        cursor: "pointer",
                        background: expanded ? "#f0f4ff" : "var(--surface)",
                      }}
                      className="order-row"
                    >
                      <td style={{ ...td(), textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: 4,
                          background: expanded ? "var(--brand)" : "var(--surface-2)",
                          color: expanded ? "#fff" : "var(--text-3)",
                          fontSize: 10, fontWeight: 700, transition: "all 0.15s",
                        }}>
                          {expanded ? "▾" : "▸"}
                        </span>
                      </td>
                      <td style={td()}>
                        <span style={{ color: "var(--text-2)", fontSize: 12 }}>
                          {order.createdDate
                            ? new Date(order.createdDate).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" })
                            : "—"}
                        </span>
                      </td>
                      <td style={td()}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {order.user?.name || <span style={{ color: "var(--text-3)" }}>—</span>}
                        </div>
                        {order.user?.companyCode && (
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{order.user.companyCode}</div>
                        )}
                      </td>
                      <td style={td()}>
                        <div style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.user?.email || "—"}</div>
                        {order.user?.phone && (
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{order.user.phone}</div>
                        )}
                      </td>
                      <td style={td()}>
                        <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                      </td>
                      <td style={td()}>
                        <Badge variant={proposalVariant(order.orderType)}>
                          {proposalLabel(order.orderType)}
                        </Badge>
                      </td>
                      <td style={{ ...td(), textAlign: "center" }}>
                        <span style={{ display: "inline-block", minWidth: 24, padding: "2px 8px", background: "var(--surface-2)", borderRadius: 99, fontWeight: 700, fontSize: 12 }}>
                          {itemCount}
                        </span>
                      </td>
                      <td style={{ ...td(), textAlign: "right", fontWeight: 700, color: total > 0 ? "var(--text-1)" : "var(--text-3)" }}>
                        {total > 0 ? `${total.toFixed(2)} €` : "—"}
                      </td>
                      <td style={{ ...td(), textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        {isCompleted ? (
                          <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>✓ Rezervuota</span>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: "#6366f1", color: "#fff", border: "none",
                              padding: "4px 10px", borderRadius: 6, fontSize: 11,
                              fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                              opacity: reservingId === order.id ? 0.6 : 1,
                            }}
                            disabled={reservingId === order.id}
                            onClick={(e) => handleReserve(order, e)}
                          >
                            {reservingId === order.id ? "…" : "Rezervuoti"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {expanded && (
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td colSpan={9} style={{ padding: 0, background: "#f5f7ff", textAlign: "left" }}>
                          <div style={{ paddingLeft: 40 }}>
                            {!itemCount ? (
                              <div style={{ padding: "12px 16px", color: "var(--text-3)", fontStyle: "italic", fontSize: 13 }}>Nėra prekių</div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                                <colgroup>
                                  <col style={{ width: 300 }} />
                                  <col style={{ width: 200 }} />
                                  <col style={{ width: 110 }} />
                                  <col style={{ width: 60 }} />
                                  <col style={{ width: 90 }} />
                                </colgroup>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                    <th style={th()}>Produktas</th>
                                    <th style={th()}>Kodas</th>
                                    <th style={th("center")}>Kiekis</th>
                                    <th style={th("right")}>Vnt. kaina</th>
                                    <th style={th("right")}>Suma</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items!.map((item, idx) => {
                                    const prod = productMap[item.productId];
                                    const lineTotal = (prod?.price ?? 0) * item.quantity;
                                    return (
                                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={td()}><span style={{ fontWeight: 500 }}>{prod?.name || <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{item.productId.slice(0, 8)}…</span>}</span></td>
                                        <td style={td()}><span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-2)" }}>{prod?.sku || "—"}</span></td>
                                        <td style={{ ...td(), textAlign: "center" }}><span style={{ fontWeight: 700 }}>×{item.quantity}</span></td>
                                        <td style={{ ...td(), textAlign: "right", color: "var(--text-2)" }}>{prod?.price != null ? `${prod.price.toFixed(2)} €` : "—"}</td>
                                        <td style={{ ...td(), textAlign: "right", fontWeight: 700 }}>{lineTotal > 0 ? `${lineTotal.toFixed(2)} €` : "—"}</td>
                                      </tr>
                                    );
                                  })}
                                  {total > 0 && (
                                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                                      <td colSpan={4} style={{ ...td(), textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Iš viso:</td>
                                      <td style={{ ...td(), textAlign: "right", fontWeight: 800, fontSize: 14 }}>{total.toFixed(2)} €</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`.order-row:hover { background: var(--surface-2) !important; }`}</style>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: "16px 20px", marginTop: 16, minHeight: 80, boxSizing: "border-box" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function th(align: "left" | "center" | "right" = "left"): CSSProperties {
  return { padding: "9px 12px", textAlign: align, fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" };
}

function td(): CSSProperties {
  return { padding: "11px 12px", verticalAlign: "middle" };
}
