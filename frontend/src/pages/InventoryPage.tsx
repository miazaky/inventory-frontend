import { useEffect, useState } from "react";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { WarehouseInventory, Product, Warehouse, CreateWarehouseInventoryCommand } from "../types";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { SelectInput } from "../components/SelectInput";

export function InventoryPage() {
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [editQty, setEditQty] = useState<WarehouseInventory | null>(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({ warehouseId: "", productId: "", quantityCurrent: "", quantityMin: "", quantityMax: "" });
  const [newQty, setNewQty] = useState("");

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
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleUpdateQty = async () => {
    if (!editQty) return;
    setSaving(true);
    try {
      await warehouseInventoryApi.updateQuantity(editQty.id, Number(newQty));
      setEditQty(null);
      setNewQty("");
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const stockStatus = (item: WarehouseInventory) => {
    if (item.quantityCurrent <= item.quantityMin) return "red";
    if (item.quantityCurrent >= item.quantityMax) return "blue";
    return "green";
  };

  const stockLabel = (item: WarehouseInventory) => {
    if (item.quantityCurrent <= item.quantityMin) return "Mažas";
    if (item.quantityCurrent >= item.quantityMax) return "Pilnas";
    return "Geras";
  };

  const columns = [
    { key: "product", header: "Pavadinimas", render: (i: WarehouseInventory) => <span style={{ fontWeight: 500 }}>{productMap[i.productId]?.name || i.productId.slice(0, 8) + "…"}</span> },
    // { key: "warehouse", header: "Sandėlis", render: (i: WarehouseInventory) => warehouseMap[i.warehouseId]?.name || i.warehouseId.slice(0, 8) + "…" },
    { key: "quantityCurrent", header: "Kiekis", render: (i: WarehouseInventory) => <span style={{ fontWeight: 600 }}>{i.quantityCurrent}</span> },
    // { key: "quantityMin", header: "Min", render: (i: WarehouseInventory) => i.quantityMin },
    // { key: "quantityMax", header: "Max", render: (i: WarehouseInventory) => i.quantityMax },
    { key: "status", header: "Statusas", render: (i: WarehouseInventory) => <Badge variant={stockStatus(i) as "red" | "blue" | "green"}>{stockLabel(i)}</Badge> },
    {
      key: "actions", header: "Veiksmai",
      render: (i: WarehouseInventory) => (
        <button onClick={() => { setEditQty(i); setNewQty(String(i.quantityCurrent)); }} className="btn btn-ghost btn-sm" style={{ display:"block", margin:"0 auto" }}>
          ✏️
        </button>

      ),
    },
  ]; 

  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));

  const filteredInventory = inventory.filter((item) => {
    const product = productMap[item.productId];
    const warehouse = warehouseMap[item.warehouseId];
    const searchText = search.toLowerCase();
    return (
      product?.name?.toLowerCase().includes(searchText) ||
      warehouse?.name?.toLowerCase().includes(searchText) ||
      item.quantityCurrent.toString().includes(searchText)
    );
  });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Inventorius</h1>
          {/* <p className="page-subtitle">Kiekiai pagal sandėlį</p> */}
        </div>
        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Ieškoti pagal produktą ar kiekį..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: 260 }}
          />
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Pridėti naują įrašą</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      <Table columns={columns} data={filteredInventory} keyExtractor={(i) => i.id} loading={loading} emptyMessage="Inventoriaus įrašų nerasta." />

      {showAdd && (
        <Modal title="Pridėti inventoriaus įrašą" onClose={() => setShowAdd(false)}>
          <div className="form-stack">
            <SelectInput label="Sandėlis" value={addForm.warehouseId} onChange={(v) => setAddForm((f) => ({ ...f, warehouseId: v }))} options={warehouseOptions} required />
            <SelectInput label="Produktas" value={addForm.productId} onChange={(v) => setAddForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div className="form-grid-3">
              {(["quantityCurrent", "quantityMin", "quantityMax"] as const).map((field) => (
                <div key={field} className="form-group">
                  <label className="form-label">{field === "quantityCurrent" ? "Kiekis" : field === "quantityMin" ? "Min" : "Max"}</label>
                  <input className="input" type="number" min={0} value={addForm[field]} onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))} />
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

      {editQty && (
        <Modal title="Atnaujinti kiekį" onClose={() => setEditQty(null)} size="sm">
          <div className="form-stack">
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
              <strong>{productMap[editQty.productId]?.name}</strong> — {warehouseMap[editQty.warehouseId]?.name}
            </p>
            <div className="form-group">
              <label className="form-label">Naujas kiekis</label>
              <input className="input" type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditQty(null)} className="btn btn-secondary">Atšaukti</button>
              <button onClick={handleUpdateQty} disabled={saving} className="btn btn-primary">{saving ? "Saugoma..." : "Atnaujinti"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
