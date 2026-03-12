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

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

  const columns = [
    { key: "type", header: "Type", render: (t: InventoryTransaction) => (
      <Badge variant={t.type === TransactionType.Inbound ? "green" : "orange"}>
        {t.type === TransactionType.Inbound ? "Inbound" : "Outbound"}
      </Badge>
    )},
    { key: "quantity", header: "Qty", render: (t: InventoryTransaction) => <span className="font-semibold">{t.quantity}</span> },
    { key: "warehouse", header: "Warehouse", render: (t: InventoryTransaction) => warehouseMap[t.warehouseId]?.name || t.warehouseId.slice(0, 8) + "…" },
    { key: "createdDate", header: "Date", render: (t: InventoryTransaction) => new Date(t.createdDate).toLocaleString() },
  ];

  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));
  const isValid = form.warehouseId && form.productId && Number(form.quantity) > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">Record inbound and outbound stock movements</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={() => setShowForm("inbound")} className="btn-primary bg-green-600 hover:bg-green-700">↓ Record Inbound</button>
        <button onClick={() => setShowForm("outbound")} className="btn-primary bg-orange-500 hover:bg-orange-600">↑ Record Outbound</button>
      </div>

      {/* History lookup */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Transaction History</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <SelectInput label="Select product" value={selectedProductId} onChange={setSelectedProductId} options={productOptions} />
          </div>
          <button onClick={() => loadHistory(selectedProductId)} disabled={!selectedProductId || loadingTx} className="btn-secondary">
            {loadingTx ? "Loading..." : "Load History"}
          </button>
        </div>
        {transactions.length > 0 || loadingTx ? (
          <Table columns={columns} data={transactions} keyExtractor={(t) => t.id} loading={loadingTx} />
        ) : (
          <p className="text-sm text-gray-400">Select a product and click Load History to see transactions.</p>
        )}
      </div>

      {showForm && (
        <Modal
          title={showForm === "inbound" ? "Record Inbound" : "Record Outbound"}
          onClose={() => { setShowForm(null); setError(null); }}
          size="sm"
        >
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <SelectInput label="Warehouse" value={form.warehouseId} onChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))} options={warehouseOptions} required />
            <SelectInput label="Product" value={form.productId} onChange={(v) => setForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input className="input" type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowForm(null); setError(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !isValid} className={`btn-primary ${showForm === "inbound" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                {saving ? "Saving..." : showForm === "inbound" ? "Record Inbound" : "Record Outbound"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
