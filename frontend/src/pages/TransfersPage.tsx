import { useEffect, useState } from "react";
import { transfersApi } from "../api/transfers";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { Product, Warehouse, TransferInventoryCommand } from "../types";
import { SelectInput } from "../components/SelectInput";

export function TransfersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({ productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([productsApi.getAll(), warehousesApi.getAll()]).then(([p, w]) => {
      setProducts(p || []);
      setWarehouses(w || []);
    });
  }, []);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      if (form.fromWarehouseId === form.toWarehouseId) {
        throw new Error("Šaltinio ir paskirties sandėliai turi skirtis.");
      }
      const cmd: TransferInventoryCommand = {
        productId: form.productId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        quantity: Number(form.quantity),
      };
      await transfersApi.transfer(cmd);
      setSuccess(true);
      setForm({ productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Perkėlimas nepavyko");
    } finally {
      setSaving(false);
    }
  };

  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));

  const isValid =
    form.productId &&
    form.fromWarehouseId &&
    form.toWarehouseId &&
    form.fromWarehouseId !== form.toWarehouseId &&
    Number(form.quantity) > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Perkėlimai</h1>
          {/* <p className="page-subtitle">Perkelti prekes iš vieno sandėlio į kitą</p> */}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="form-stack">
            {error && <div className="alert alert-error">⚠ {error}</div>}
            {success && <div className="alert alert-success">✅ Perkėlimas sėkmingas!</div>}

            <SelectInput
              label="Produktas"
              value={form.productId}
              onChange={(v) => setForm((f) => ({ ...f, productId: v }))}
              options={productOptions}
              required
            />

            <div className="form-grid-2">
              <SelectInput
                label="Iš sandėlio"
                value={form.fromWarehouseId}
                onChange={(v) => setForm((f) => ({ ...f, fromWarehouseId: v }))}
                options={warehouseOptions}
                required
              />
              <SelectInput
                label="Į sandėlį"
                value={form.toWarehouseId}
                onChange={(v) => setForm((f) => ({ ...f, toWarehouseId: v }))}
                options={warehouseOptions.filter((o) => o.value !== form.fromWarehouseId)}
                required
              />
            </div>

            {/* Visual transfer arrow */}
            {form.fromWarehouseId && form.toWarehouseId && (
              <div className="transfer-visual">
                <span className="transfer-pill from">
                  {warehouses.find((w) => w.id === form.fromWarehouseId)?.name}
                </span>
                <span style={{ fontSize: 20, color: "var(--text-3)" }}>→</span>
                <span className="transfer-pill to">
                  {warehouses.find((w) => w.id === form.toWarehouseId)?.name}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Kiekis <span className="req">*</span></label>
              <input
                className="input"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="pvz. 50"
              />
            </div>

            <button onClick={handleSubmit} disabled={saving || !isValid} className="btn btn-primary btn-full">
              {saving ? "Perkeliama..." : "Perkelti į sandėlį"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
