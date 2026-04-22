import { useEffect, useState } from "react";
import { ordersApi } from "../api/orders";
import { productsApi, isGroundPriceProduct } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { Order, Product, Warehouse } from "../types";
import { Badge } from "../components/Badge";
import { SelectInput } from "../components/SelectInput";
import { Modal } from "../components/Modal";

export function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [newWarehouseId, setNewWarehouseId] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loadOrderId, setLoadOrderId] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ productId: "", quantity: "" });
  const [savingItem, setSavingItem] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([productsApi.getAll(), warehousesApi.getAll()]).then(([p, w]) => {
      setProducts((p || []).filter((product) => !isGroundPriceProduct(product)));
      setWarehouses(w || []);
    });
  }, []);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));
  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));

  const handleCreateOrder = async () => {
    if (!newWarehouseId) return;
    setCreatingOrder(true); setError(null); setSuccess(null);
    try {
      const id = await ordersApi.create({ warehouseId: newWarehouseId });
      const order = await ordersApi.getById(id);
      setActiveOrder(order);
      setSuccess(`Užsakymas sukurtas: ${id.slice(0, 8)}…`);
      setNewWarehouseId("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setCreatingOrder(false); }
  };

  const handleLoadOrder = async () => {
    if (!loadOrderId) return;
    setLoadingOrder(true); setError(null);
    try {
      const order = await ordersApi.getById(loadOrderId);
      setActiveOrder(order);
    } catch { setError("Užsakymas nerastas"); }
    finally { setLoadingOrder(false); }
  };

  const handleAddItem = async () => {
    if (!activeOrder) return;
    setSavingItem(true); setError(null);
    try {
      await ordersApi.addItem(activeOrder.id, { orderId: activeOrder.id, productId: itemForm.productId, quantity: Number(itemForm.quantity) });
      const refreshed = await ordersApi.getById(activeOrder.id);
      setActiveOrder(refreshed);
      setShowAddItem(false);
      setItemForm({ productId: "", quantity: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSavingItem(false); }
  };

  const handleComplete = async () => {
    if (!activeOrder) return;
    setCompleting(true); setError(null);
    try {
      await ordersApi.complete(activeOrder.id);
      const refreshed = await ordersApi.getById(activeOrder.id);
      setActiveOrder(refreshed);
      setSuccess("Užsakymas sėkmingai užbaigtas!");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setCompleting(false); }
  };

  const statusVariant = (status: string | null) => {
    if (!status) return "gray";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "green";
    if (s.includes("pend")) return "yellow";
    return "blue";
  };

  const isCompleted = activeOrder?.status?.toLowerCase().includes("complete");

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Užsakymai</h1>
          <p className="page-subtitle">Kurti ir valdyti išsiuntimo užsakymus</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>✅ {success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {/* Create order */}
        <div className="card">
          <div className="card-header"><span className="card-title">Sukurti naują užsakymą</span></div>
          <div className="card-body">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <SelectInput label="Sandėlis" value={newWarehouseId} onChange={setNewWarehouseId} options={warehouseOptions} required />
              </div>
              <button onClick={handleCreateOrder} disabled={!newWarehouseId || creatingOrder} className="btn btn-primary">
                {creatingOrder ? "Kuriama…" : "Sukurti"}
              </button>
            </div>
          </div>
        </div>

        {/* Load existing */}
        <div className="card">
          <div className="card-header"><span className="card-title">Įkelti esamą užsakymą</span></div>
          <div className="card-body">
            <div style={{ display: "flex", gap: 10 }}>
              <input className="input" placeholder="Įklijuokite užsakymo ID (UUID)" value={loadOrderId} onChange={(e) => setLoadOrderId(e.target.value)} style={{ flex: 1 }} />
              <button onClick={handleLoadOrder} disabled={!loadOrderId || loadingOrder} className="btn btn-secondary">
                {loadingOrder ? "Kraunama…" : "Įkelti"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active order */}
      {activeOrder && (
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Užsakymas </span>
              <span className="mono">{activeOrder.id.slice(0, 8)}…</span>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{warehouseMap[activeOrder.warehouseId]?.name || activeOrder.warehouseId}</div>
            </div>
            <Badge variant={statusVariant(activeOrder.status) as "green" | "yellow" | "blue" | "gray"}>{activeOrder.status || "Nežinoma"}</Badge>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Prekės ({activeOrder.items?.length || 0})</span>
              {!isCompleted && (
                <button onClick={() => setShowAddItem(true)} className="btn btn-ghost btn-sm">+ Pridėti prekę</button>
              )}
            </div>
            {!activeOrder.items?.length ? (
              <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "24px 0" }}>Dar nėra prekių. Pridėkite produktus prie šio užsakymo.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "var(--surface-2)", borderRadius: "var(--r)", fontSize: 13 }}>
                    <span>{productMap[item.productId]?.name || item.productId.slice(0, 8) + "…"}</span>
                    <span style={{ fontWeight: 600 }}>×{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!isCompleted && (
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
              <button onClick={handleComplete} disabled={completing || !activeOrder.items?.length} className="btn btn-success btn-full">
                {completing ? "Baigiama…" : "✓ Užbaigti užsakymą"}
              </button>
            </div>
          )}
        </div>
      )}

      {showAddItem && (
        <Modal title="Pridėti prekę prie užsakymo" onClose={() => setShowAddItem(false)} size="sm">
          <div className="form-stack">
            <SelectInput label="Produktas" value={itemForm.productId} onChange={(v) => setItemForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div className="form-group">
              <label className="form-label">Kiekis <span className="req">*</span></label>
              <input className="input" type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddItem(false)} className="btn btn-secondary">Atšaukti</button>
              <button onClick={handleAddItem} disabled={savingItem || !itemForm.productId || Number(itemForm.quantity) < 1} className="btn btn-primary">
                {savingItem ? "Pridedama…" : "Pridėti prekę"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
