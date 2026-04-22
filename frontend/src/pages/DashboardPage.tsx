import { useEffect, useState } from "react";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { productsApi, isGroundPriceProduct } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import { ordersApi } from "../api/orders";
import { Badge } from "../components/Badge";
import type { WarehouseInventory, Product, Warehouse, Order } from "../types";
import { SystemCategory, SYSTEM_CATEGORY_LABELS } from "../types";

export function DashboardPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStock, setLowStock]     = useState<WarehouseInventory[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, w, ls, o] = await Promise.all([
          productsApi.getAll(),
          warehousesApi.getAll(),
          warehouseInventoryApi.getLowStock(),
          ordersApi.getAll(),
        ]);
        setProducts((p || []).filter((product) => !isGroundPriceProduct(product)));
        setWarehouses(w || []);
        setLowStock(Array.isArray(ls) ? ls : []);
        setPendingOrders((o || []).filter((ord) => ord.status?.toLowerCase().includes("pend")));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const productMap    = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap  = Object.fromEntries(warehouses.map((w) => [w.id, w]));

  // Group products by category
  const SHOWN_CATEGORIES = [
    { cat: SystemCategory.Ground,     icon: "🌱", color: "#16a34a" },
    { cat: SystemCategory.FlatRoof,   icon: "🏢", color: "#2563eb" },
    { cat: SystemCategory.SlopedRoof, icon: "🏠", color: "#9333ea" },
    { cat: SystemCategory.RoofShared, icon: "🔗", color: "#0891b2" },
    { cat: SystemCategory.Shared,     icon: "⚙️", color: "#64748b" },
  ];

  const byCategory = SHOWN_CATEGORIES.map(({ cat, icon, color }) => ({
    cat, icon, color,
    catLabel: SYSTEM_CATEGORY_LABELS[cat],
    count: products.filter((p) => p.systemCategory === cat).length,
  }));

  if (loading)
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "var(--text-3)" }}>Kraunama...</div>;
  if (error)
    return <div className="page"><div className="alert alert-error">⚠ {error}</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Apžvalga</h1>
          <p className="page-subtitle">Inventoriaus sistemos suvestinė</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon c-indigo">📦</div>
          <div>
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Iš viso medžiagų</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon c-teal">🕐</div>
          <div>
            <div className="stat-value">{pendingOrders.length}</div>
            <div className="stat-label">Laukiami užsakymai</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon c-orange">⚠️</div>
          <div>
            <div className="stat-value">{lowStock.length}</div>
            <div className="stat-label">Mažo kiekio įspėjimai</div>
          </div>
        </div>
      </div>

      {/* Materials by category */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Medžiagos pagal sistemą</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
          {byCategory.map(({ cat, icon, color, catLabel, count }, i) => (
            <div
              key={cat}
              style={{
                padding: "20px 18px",
                borderRight: i < byCategory.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
              }}
            >
              <div style={{ fontSize: 20 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600, lineHeight: 1.3 }}>{catLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Low stock grouped by category */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Mažo kiekio medžiagos</span>
          {lowStock.length > 0 && <Badge variant="red">{lowStock.length} įspėjimai</Badge>}
        </div>
        {lowStock.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-3)" }}>
            ✅ Visi kiekiai yra normalūs
          </div>
        ) : (
          <>
            {/* Group low stock by product category */}
            {SHOWN_CATEGORIES.map(({ cat, icon, color }) => {
              const items = lowStock
                .filter((inv) => productMap[inv.productId]?.systemCategory === cat)
                .sort((a, b) => {
                  const skuA = productMap[a.productId]?.sku || "";
                  const skuB = productMap[b.productId]?.sku || "";
                  return skuA.localeCompare(skuB, undefined, { sensitivity: "base" });
                });
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div style={{
                    padding: "8px 16px", background: "var(--surface-2)",
                    borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                    fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {icon} {SYSTEM_CATEGORY_LABELS[cat]}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <colgroup>
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                            {productMap[item.productId]?.name || item.productId.slice(0, 8) + "…"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "var(--text-2)", fontSize: 12 }}>
                            <span style={{ fontFamily: "monospace", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>
                              {productMap[item.productId]?.sku || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>
                            {warehouseMap[item.warehouseId]?.name || item.warehouseId.slice(0, 8) + "…"}
                          </td>
                          <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--danger)" }}>
                            {item.quantityCurrent}
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <Badge variant="red">Mažas kiekis</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pending orders */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Laukiami užsakymai</span>
          {pendingOrders.length > 0 && <Badge variant="yellow">{pendingOrders.length}</Badge>}
        </div>
        {pendingOrders.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-3)" }}>✅ Laukiamų užsakymų nėra.</div>
        ) : (
          <div>
            {pendingOrders.map((o, i) => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: i < pendingOrders.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{o.user?.name || <span style={{ color: "var(--text-3)" }}>Svečias</span>}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                    {o.user?.email || "—"}
                    {o.user?.phone ? ` · ${o.user.phone}` : ""}
                    {" · "}
                    {o.createdDate ? new Date(o.createdDate).toLocaleDateString("lt-LT") : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>{o.items?.length ?? 0} prekės</span>
                  <Badge variant="yellow">Laukiama</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}