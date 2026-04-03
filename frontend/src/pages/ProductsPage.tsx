import { useEffect, useState } from "react";
import { productsApi } from "../api/products";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import type { Product, CreateProductCommand, UpdateProductCommand, WarehouseInventory } from "../types";
import { Modal } from "../components/Modal";

interface ProductFormData {
  sku: string;
  name: string;
  length: string;
  price: string;
}

const emptyForm: ProductFormData = { sku: "", name: "", length: "", price: "" };

function ProductRow({
  product,
  invs,
  onSaved,
  onDelete,
}: {
  product: Product;
  invs: WarehouseInventory[];
  onSaved: () => void;
  onDelete: (p: Product) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    sku:    product.sku           || "",
    name:   product.name          || "",
    length: product.length?.toString() || "",
    price:  product.price?.toString()  || "",
  });
  const [qtys, setQtys] = useState<Record<string, string>>(
    Object.fromEntries(invs.map((i) => [i.id, String(i.quantityCurrent)]))
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = (field: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cmd: UpdateProductCommand = {
        id:     product.id,
        sku:    form.sku    || undefined,
        name:   form.name,
        length: form.length ? Number(form.length) : undefined,
        price:  form.price  ? Number(form.price)  : undefined,
      };
      await productsApi.update(product.id, cmd);

      await Promise.all(
        invs.map((inv) => {
          const newQty = Number(qtys[inv.id] ?? inv.quantityCurrent);
          if (newQty !== inv.quantityCurrent) {
            return warehouseInventoryApi.updateQuantity(inv.id, newQty);
          }
          return Promise.resolve();
        })
      );

      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Klaida");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      sku:    product.sku           || "",
      name:   product.name          || "",
      length: product.length?.toString() || "",
      price:  product.price?.toString()  || "",
    });
    setQtys(Object.fromEntries(invs.map((i) => [i.id, String(i.quantityCurrent)])));
    setError(null);
    setEditing(false);
  };

  const totalQty = invs.reduce((s, i) => s + i.quantityCurrent, 0);

  if (editing) {
    return (
      <>
        <tr className="row-editing">
          <td>
            <input className="input input-inline" value={form.sku}  onChange={set("sku")}  placeholder="Kodas" />
          </td>
          <td>
            <input className="input input-inline" value={form.name} onChange={set("name")} placeholder="Pavadinimas" />
          </td>
          <td>
            <input className="input input-inline" type="number" value={form.length} onChange={set("length")} placeholder="mm" style={{ width: 90 }} />
          </td>
          <td style={{ textAlign: "center" }}>
            {invs.length === 0 ? (
              <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                {invs.map((inv) => (
                  <input
                    key={inv.id}
                    className="input input-inline"
                    type="number"
                    min={0}
                    value={qtys[inv.id] ?? inv.quantityCurrent}
                    onChange={(e) => setQtys((q) => ({ ...q, [inv.id]: e.target.value }))}
                    style={{ width: 70, textAlign: "center" }}
                  />
                ))}
              </div>
            )}
          </td>
          <td>
            <input className="input input-inline" type="number" step="0.01" value={form.price} onChange={set("price")} placeholder="0.00" style={{ width: 100 }} />
          </td>
          <td>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn btn-primary btn-sm">
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
      <td><span className="mono">{product.sku || "—"}</span></td>
      <td><span style={{ fontWeight: 500 }}>{product.name || "—"}</span></td>
      <td>{product.length != null ? `${product.length} cm` : "—"}</td>
      <td style={{ textAlign: "center", fontWeight: 700 }}>{totalQty > 0 ? totalQty : <span style={{ color: "var(--text-3)" }}>—</span>}</td>
      <td>{product.price != null ? `${product.price.toFixed(2)} €` : "—"}</td>
      <td>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setEditing(true)} className="btn btn-ghost btn-icon" title="Redaguoti">✏️</button>
          <button onClick={() => onDelete(product)} className="btn btn-ghost-danger btn-icon" title="Ištrinti">🗑️</button>
        </div>
      </td>
    </tr>
  );
}

export function ProductsPage() {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState<ProductFormData>(emptyForm);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<Product | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [p, inv] = await Promise.all([
        productsApi.getAll(),
        warehouseInventoryApi.getAll(),
      ]);
      setProducts(p  || []);
      setInventory(inv || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const invByProduct: Record<string, WarehouseInventory[]> = {};
  inventory.forEach((inv) => {
    if (!invByProduct[inv.productId]) invByProduct[inv.productId] = [];
    invByProduct[inv.productId].push(inv);
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const cmd: CreateProductCommand = {
        sku:    addForm.sku    || undefined,
        name:   addForm.name,
        length: addForm.length ? Number(addForm.length) : undefined,
        price:  addForm.price  ? Number(addForm.price)  : undefined,
      };
      await productsApi.create(cmd);
      setShowAdd(false);
      setAddForm(emptyForm);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await productsApi.delete(deleting.id);
      setDeleting(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) =>
    `${p.name ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Medžiagos</h1>
        </div>
        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Ieškoti pagal pavadinimą ar kodą..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: 240 }}
          />
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Pridėti naują produktą</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kodas</th>
              <th>Pavadinimas</th>
              <th>Ilgis</th>
              <th style={{ textAlign: "center" }}>Kiekis</th>
              <th>Kaina</th>
              <th style={{ textAlign: "center" }}>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="td-loading">Kraunama...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="td-empty">Produktų nerasta.</td></tr>
            ) : (
              filtered.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  invs={invByProduct[p.id] ?? []}
                  onSaved={load}
                  onDelete={setDeleting}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Pridėti produktą" onClose={() => { setShowAdd(false); setAddForm(emptyForm); }}>
          <div className="form-stack">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Kodas</label>
                <input className="input" value={addForm.sku} onChange={(e) => setAddForm((f) => ({ ...f, sku: e.target.value }))} placeholder="pvz. MET-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Pavadinimas <span className="req">*</span></label>
                <input className="input" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Produkto pavadinimas" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Ilgis (mm)</label>
                <input className="input" type="number" value={addForm.length} onChange={(e) => setAddForm((f) => ({ ...f, length: e.target.value }))} placeholder="pvz. 1200" />
              </div>
              <div className="form-group">
                <label className="form-label">Kaina (€)</label>
                <input className="input" type="number" step="0.01" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} placeholder="pvz. 9.99" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); }} className="btn btn-secondary">Atšaukti</button>
              <button onClick={handleCreate} disabled={saving || !addForm.name} className="btn btn-primary">
                {saving ? "Saugoma..." : "Išsaugoti"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Ištrinti produktą" onClose={() => setDeleting(null)} size="sm">
          <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 0 }}>
            Ar tikrai norite ištrinti <strong>{deleting.name}</strong>? Šio veiksmo negalima atšaukti.
          </p>
          <div className="modal-footer">
            <button onClick={() => setDeleting(null)} className="btn btn-secondary">Atšaukti</button>
            <button onClick={handleDelete} disabled={saving} className="btn btn-danger">
              {saving ? "Trinama..." : "Ištrinti"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
