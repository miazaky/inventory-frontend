import { useEffect, useState } from "react";
import { transactionsApi } from "../api/transactions";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { InventoryTransaction, Product, Warehouse, CreateTransactionCommand } from "../types";
import { TransactionType } from "../types";
import { Table } from "../components/Table";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { SelectInput } from "../components/SelectInput";

export function TransactionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadingTx, setLoadingTx] = useState(false);

  const [showForm, setShowForm] = useState<"inbound" | "outbound" | null>(null);
  const [form, setForm] = useState({ warehouseId: "", productId: "", quantity: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([productsApi.getAll(), warehousesApi.getAll()]).then(([p, w]) => {
      setProducts(p || []);
      setWarehouses(w || []);
    });
  }, []);

  const loadHistory = async (productId: string) => {
    if (!productId) return;
    setLoadingTx(true);
    try {
      const data = await transactionsApi.getHistory(productId);
      setTransactions(Array.isArray(data) ? data : []);
    } catch { setTransactions([]); }
    finally { setLoadingTx(false); }
  };

  const handleSubmit = async () => {
    if (!showForm) return;
    setSaving(true);
    setError(null);
    try {
      const cmd: CreateTransactionCommand = {
        warehouseId: form.warehouseId,
        productId: form.productId,
        quantity: Number(form.quantity),
      };
      if (showForm === "inbound") await transactionsApi.createInbound(cmd);
      else await transactionsApi.createOutbound(cmd);
      setShowForm(null);
      setForm({ warehouseId: "", productId: "", quantity: "" });
      if (selectedProductId === form.productId) loadHistory(selectedProductId);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

  const columns = [
    { key: "type", header: "Tipas", render: (t: InventoryTransaction) => (
      <Badge variant={t.type === TransactionType.Inbound ? "green" : "orange"}>
        {t.type === TransactionType.Inbound ? "Įvežimas" : "Išvežimas"}
      </Badge>
    )},
    { key: "quantity", header: "Kiekis", render: (t: InventoryTransaction) => <span style={{ fontWeight: 600 }}>{t.quantity}</span> },
    { key: "warehouse", header: "Sandėlis", render: (t: InventoryTransaction) => warehouseMap[t.warehouseId]?.name || t.warehouseId.slice(0, 8) + "…" },
    { key: "createdDate", header: "Data", render: (t: InventoryTransaction) => new Date(t.createdDate).toLocaleString() },
  ];

  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));
  const isValid = form.warehouseId && form.productId && Number(form.quantity) > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Sandoriai</h1>
          <p className="page-subtitle">Užregistruoti įvežimus ir išvežimus</p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => setShowForm("inbound")} className="btn btn-success">↓ Įvežimas</button>
          <button onClick={() => setShowForm("outbound")} className="btn" style={{ background: "#f97316", color: "#fff" }}>↑ Išvežimas</button>
        </div>
      </div>

      {/* History lookup */}
      <div className="card">
        <div className="card-header"><span className="card-title">Sandorių istorija</span></div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ flex: 1, maxWidth: 300 }}>
              <SelectInput label="Pasirinkti produktą" value={selectedProductId} onChange={setSelectedProductId} options={productOptions} />
            </div>
            <button onClick={() => loadHistory(selectedProductId)} disabled={!selectedProductId || loadingTx} className="btn btn-secondary">
              {loadingTx ? "Kraunama..." : "Rodyti istoriją"}
            </button>
          </div>
          {transactions.length > 0 || loadingTx ? (
            <Table columns={columns} data={transactions} keyExtractor={(t) => t.id} loading={loadingTx} />
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>Pasirinkite produktą ir spauskite „Rodyti istoriją".</p>
          )}
        </div>
      </div>

      {showForm && (
        <Modal
          title={showForm === "inbound" ? "Užregistruoti įvežimą" : "Užregistruoti išvežimą"}
          onClose={() => { setShowForm(null); setError(null); }}
          size="sm"
        >
          <div className="form-stack">
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <SelectInput label="Sandėlis" value={form.warehouseId} onChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))} options={warehouseOptions} required />
            <SelectInput label="Produktas" value={form.productId} onChange={(v) => setForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div className="form-group">
              <label className="form-label">Kiekis <span className="req">*</span></label>
              <input className="input" type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowForm(null); setError(null); }} className="btn btn-secondary">Atšaukti</button>
              <button
                onClick={handleSubmit}
                disabled={saving || !isValid}
                className="btn"
                style={{ background: showForm === "inbound" ? "var(--success)" : "#f97316", color: "#fff" }}
              >
                {saving ? "Saugoma..." : showForm === "inbound" ? "Įvežimas" : "Išvežimas"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
