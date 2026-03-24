import { useEffect, useState } from "react";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import { ordersApi } from "../api/orders";
import { Badge } from "../components/Badge";
import type { WarehouseInventory, Product, Warehouse, Order } from "../types";

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStock, setLowStock] = useState<WarehouseInventory[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, w, ls, o] = await Promise.all([
          productsApi.getAll(),
          warehousesApi.getAll(),
          warehouseInventoryApi.getLowStock(),
          ordersApi.getAll(),
        ]);
        setProducts(p || []);
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

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

  if (loading)
    return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:240, color:"var(--text-3)" }}>Kraunama...</div>;
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

      {/* Stats */}
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
            <div className="stat-label">Užsakymai</div>
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

      {/* Low stock table */}
      <div className="card" style={{ marginBottom: 16 }}>
        {/* <div className="card-header">
          <span className="card-title">Mažo kiekio medžiagos</span>
          {lowStock.length > 0 && <Badge variant="red">{lowStock.length} įspėjimai</Badge>}
        </div> */}
        {lowStock.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-3)" }}>
            ✅ Visi kiekiai yra normalūs
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Produktas</th>
                <th>Sandėlis</th>
                <th>Kiekis</th>
                <th>Min</th>
                <th>Statusas</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{productMap[item.productId]?.name || item.productId.slice(0, 8) + "…"}</td>
                  <td style={{ color: "var(--text-2)" }}>{warehouseMap[item.warehouseId]?.name || item.warehouseId.slice(0, 8) + "…"}</td>
                  <td style={{ fontWeight: 600, color: "var(--danger)" }}>{item.quantityCurrent}</td>
                  <td>{item.quantityMin}</td>
                  <td><Badge variant="red">Mažas kiekis</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending orders list */}
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
