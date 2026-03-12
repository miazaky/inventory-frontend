import { useEffect, useState } from "react";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type {
  WarehouseInventory,
  Product,
  Warehouse,
  CreateWarehouseInventoryCommand,
} from "../types";
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

  // Add form state
  const [addForm, setAddForm] = useState({
    warehouseId: "", productId: "", quantityCurrent: "", quantityMin: "", quantityMax: "",
  });
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
    return "Gerai";
  };

  const columns = [
    { key: "product", header: "Pavadinimas", render: (i: WarehouseInventory) => <span className="font-medium">{productMap[i.productId]?.name || i.productId.slice(0, 8) + "…"}</span> },
    // { key: "warehouse", header: "Sandėlis", render: (i: WarehouseInventory) => warehouseMap[i.warehouseId]?.name || i.warehouseId.slice(0, 8) + "…" },
    { key: "quantityCurrent", header: "Kiekis", render: (i: WarehouseInventory) => <span className="font-semibold">{i.quantityCurrent}</span> },
    // { key: "quantityMin", header: "Min", render: (i: WarehouseInventory) => i.quantityMin },
    // { key: "quantityMax", header: "Max", render: (i: WarehouseInventory) => i.quantityMax },
    { key: "status", header: "Statusas", render: (i: WarehouseInventory) => <Badge variant={stockStatus(i)}>{stockLabel(i)}</Badge> },
    {
      key: "actions", header: "Veiksmai",
      render: (i: WarehouseInventory) => (
        <button onClick={() => { setEditQty(i); setNewQty(String(i.quantityCurrent)); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
          Atnaujinti kiekį
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventorius</h1>
          {/* <p className="text-sm text-gray-500 mt-1">Stock levels per warehouse</p> */}
        </div>
        <input
          type="text"
          placeholder="Search by product or quantity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Pridėti naują įrašą</button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

      <Table columns={columns} data={filteredInventory} keyExtractor={(i) => i.id} loading={loading} emptyMessage="No inventory entries yet." />

      {showAdd && (
        <Modal title="Add Inventory Entry" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <SelectInput label="Warehouse" value={addForm.warehouseId} onChange={(v) => setAddForm((f) => ({ ...f, warehouseId: v }))} options={warehouseOptions} required />
            <SelectInput label="Product" value={addForm.productId} onChange={(v) => setAddForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div className="grid grid-cols-3 gap-3">
              {(["quantityCurrent", "quantityMin", "quantityMax"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {field.replace("quantity", "")}
                  </label>
                  <input className="input" type="number" min={0} value={addForm[field]} onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !addForm.warehouseId || !addForm.productId} className="btn-primary">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editQty && (
        <Modal title="Update Quantity" onClose={() => setEditQty(null)} size="sm">
          <p className="text-sm text-gray-500 mb-4">
            <strong>{productMap[editQty.productId]?.name}</strong> at <strong>{warehouseMap[editQty.warehouseId]?.name}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New quantity</label>
            <input className="input" type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setEditQty(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleUpdateQty} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Update"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
