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
        throw new Error("Source and destination warehouses must be different.");
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
      setError(e instanceof Error ? e.message : "Transfer failed");
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Perkėlimai</h1>
        {/* <p className="text-sm text-gray-500 mt-1">Move stock from one warehouse to another</p> */}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
            ✅ Perkėlimas sėkmingas!
          </div>
        )}

        <SelectInput
          label="Produktas"
          value={form.productId}
          onChange={(v) => setForm((f) => ({ ...f, productId: v }))}
          options={productOptions}
          required
        />

        <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center justify-center gap-3 py-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
              {warehouses.find((w) => w.id === form.fromWarehouseId)?.name}
            </span>
            <span className="text-2xl text-gray-400">→</span>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium">
              {warehouses.find((w) => w.id === form.toWarehouseId)?.name}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis <span className="text-red-500">*</span></label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            placeholder="e.g. 50"
          />
        </div>

        <button onClick={handleSubmit} disabled={saving || !isValid} className="btn-primary w-full justify-center">
          {saving ? "Perkeliama..." : "Perkelti į sandėlį"}
        </button>
      </div>
    </div>
  );
}
