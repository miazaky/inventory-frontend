import { useEffect, useState } from "react";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { WarehouseInventory, Product, Warehouse, CreateWarehouseInventoryCommand } from "../types";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { SelectInput } from "../components/SelectInput";

function InventoryRow({
  item,
  productMap,
  warehouseMap,
  onSaved,
}: {
  item: WarehouseInventory;
  productMap: Record<string, Product>;
  warehouseMap: Record<string, Warehouse>;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantityCurrent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stockStatus = (i: WarehouseInventory): "red" | "blue" | "green" => {
    if (i.quantityCurrent <= i.quantityMin) return "red";
    if (i.quantityCurrent >= i.quantityMax) return "blue";
    return "green";
  };

  const stockLabel = (i: WarehouseInventory) => {
    if (i.quantityCurrent <= i.quantityMin) return "Mažas";
    if (i.quantityCurrent >= i.quantityMax) return "Pilnas";
    return "Geras";
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await warehouseInventoryApi.updateQuantity(item.id, Number(qty));
      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Klaida");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setQty(String(item.quantityCurrent));
    setError(null);
    setEditing(false);
  };

  const product = productMap[item.productId];
  const productName = product?.name || item.productId.slice(0, 8) + "…";
  const productSku  = product?.sku  || "—";
  const warehouseName = warehouseMap[item.warehouseId]?.name || item.warehouseId.slice(0, 8) + "…";

  if (editing) {
    return (
      <>
        <tr className="row-editing">
          <td>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-2)" }}>
              {productSku}
            </span>
          </td>
          <td><span style={{ fontWeight: 500 }}>{productName}</span></td>
          <td>{warehouseName}</td>
          <td>
            <input
              className="input input-inline"
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ width: 90 }}
              autoFocus
            />
          </td>
          <td>
            <Badge variant={stockStatus(item)}>{stockLabel(item)}</Badge>
          </td>
          <td>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? "…" : "✓ Išsaugoti"}
              </button>
              <button onClick={handleCancel} className="btn btn-secondary btn-sm">Atšaukti</button>
            </div>
          </td>
        </tr>
        {error && (
          <tr>
            <td colSpan={6}>
              <div className="alert alert-error" style={{ margin: "4px 0", padding: "6px 10px", fontSize: 12 }}>⚠ {error}</div>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr>
      <td>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-2)" }}>
          {productSku}
        </span>
      </td>
      <td><span style={{ fontWeight: 500 }}>{productName}</span></td>
      <td>{warehouseName}</td>
      <td><span style={{ fontWeight: 600 }}>{item.quantityCurrent}</span></td>
      <td><Badge variant={stockStatus(item)}>{stockLabel(item)}</Badge></td>
      <td>
        <button
          onClick={() => setEditing(true)}
          className="btn btn-ghost btn-icon"
          title="Redaguoti kiekį"
          style={{ display: "block", margin: "0 auto" }}
        >
          ✏️
        </button>
      </td>
    </tr>
  );
}

export function InventoryPage() {
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    warehouseId: "", productId: "", quantityCurrent: "", quantityMin: "", quantityMax: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const [inv, prods, whs] = await Promise.all([
        warehouseInventoryApi.getAll(),
        productsApi.getAll(),
        warehousesApi.getAll(),
      ]);
      setInventory(Array.isArray(inv) ? inv : []);
      setProducts(prods || []);
      setWarehouses(whs || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));
  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));

  const handleAdd = async () => {
    setSaving(true);
    try {
      const cmd: CreateWarehouseInventoryCommand = {
        warehouseId: addForm.warehouseId,
        productId: addForm.productId,
        quantityCurrent: Number(addForm.quantityCurrent),
        quantityMin: Number(addForm.quantityMin),
        quantityMax: Number(addForm.quantityMax),
      };
      await warehouseInventoryApi.create(cmd);
      setShowAdd(false);
      setAddForm({ warehouseId: "", productId: "", quantityCurrent: "", quantityMin: "", quantityMax: "" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = inventory
    .filter((item) => {
      const product = productMap[item.productId];
      const warehouse = warehouseMap[item.warehouseId];
      const q = search.toLowerCase();

      return (
        product?.name?.toLowerCase().includes(q) ||
        product?.sku?.toLowerCase().includes(q) ||
        warehouse?.name?.toLowerCase().includes(q) ||
        item.quantityCurrent.toString().includes(q)
      );
    })
    .sort((a, b) => {
      const skuA = productMap[a.productId]?.sku || "";
      const skuB = productMap[b.productId]?.sku || "";
      return skuA.localeCompare(skuB, undefined, { sensitivity: "base" });
    });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Inventorius</h1>
        </div>
        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Ieškoti pagal kodą, produktą ar sandėlį..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: 280 }}
          />
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Pridėti naują įrašą</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kodas</th>
              <th>Pavadinimas</th>
              <th>Sandėlis</th>
              <th>Kiekis</th>
              <th>Statusas</th>
              <th>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="td-loading">Kraunama...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="td-empty">Inventoriaus įrašų nerasta.</td></tr>
            ) : (
              filtered.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  productMap={productMap}
                  warehouseMap={warehouseMap}
                  onSaved={load}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Pridėti inventoriaus įrašą" onClose={() => setShowAdd(false)}>
          <div className="form-stack">
            <SelectInput label="Sandėlis" value={addForm.warehouseId} onChange={(v) => setAddForm((f) => ({ ...f, warehouseId: v }))} options={warehouseOptions} required />
            <SelectInput label="Produktas" value={addForm.productId} onChange={(v) => setAddForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div className="form-grid-3">
              {(["quantityCurrent", "quantityMin", "quantityMax"] as const).map((field) => (
                <div key={field} className="form-group">
                  <label className="form-label">
                    {field === "quantityCurrent" ? "Kiekis" : field === "quantityMin" ? "Min" : "Max"}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={addForm[field]}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Atšaukti</button>
              <button onClick={handleAdd} disabled={saving || !addForm.warehouseId || !addForm.productId} className="btn btn-primary">
                {saving ? "Saugoma..." : "Išsaugoti"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
