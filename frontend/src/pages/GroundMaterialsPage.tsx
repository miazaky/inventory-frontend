import React, { useEffect, useState } from "react";
import { productsApi } from "../api/products";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { warehousesApi } from "../api/warehouses";
import type { Product, WarehouseInventory, Warehouse, UpdateProductCommand } from "../types";
import { SystemCategory } from "../types";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";

export function GroundMaterialsPage() {
  return <CategoryMaterialsPage category={SystemCategory.Ground} />;
}
export function FlatRoofMaterialsPage() {
  return <CategoryMaterialsPage category={SystemCategory.FlatRoof} />;
}
export function SlopedRoofMaterialsPage() {
  return <CategoryMaterialsPage category={SystemCategory.SlopedRoof} />;
}

const PAGE_META: Record<number, { title: string; subtitle: string; icon: string; color: string }> = {
  [SystemCategory.Ground]:     { title: "Žemės sistemos medžiagos",           subtitle: "Ežio ir polinės sistemos komponentai",          icon: "🌱", color: "#16a34a" },
  [SystemCategory.FlatRoof]:   { title: "Plokščio stogo sistemos medžiagos",  subtitle: "PT05 / PT10 / PT15 / PT20 / RV10 komponentai", icon: "🏢", color: "#2563eb" },
  [SystemCategory.SlopedRoof]: { title: "Šlaitinio stogo sistemos medžiagos", subtitle: "Bėgeliai, kabliai ir tvirtinimo elementai",     icon: "🏠", color: "#9333ea" },
};

// ── Inline editable row ──────────────────────────────────────────────────────
interface ProductRowProps {
  product: Product;
  invs: WarehouseInventory[];
  onSaved: () => void;
  onDelete: (p: Product) => void;
}

function ProductRow({ product, invs, onSaved, onDelete }: ProductRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    sku:    product.sku           ?? "",
    name:   product.name          ?? "",
    length: product.length?.toString() ?? "",
    price:  product.price?.toString()  ?? "",
    // qty per inventory record: id → quantity string
    qtys:   Object.fromEntries(invs.map((i) => [i.id, String(i.quantityCurrent)])),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = (field: "sku" | "name" | "length" | "price") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const setQty = (invId: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, qtys: { ...f.qtys, [invId]: e.target.value } }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save product fields
      const cmd: UpdateProductCommand = {
        id:             product.id,
        sku:            form.sku    || undefined,
        name:           form.name,
        length:         form.length ? Number(form.length) : undefined,
        price:          form.price  ? Number(form.price)  : undefined,
        systemCategory: product.systemCategory,
      };
      await productsApi.update(product.id, cmd);

      // Save each inventory quantity that changed
      await Promise.all(
        invs.map((inv) => {
          const newQty = Number(form.qtys[inv.id] ?? inv.quantityCurrent);
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
      sku:    product.sku           ?? "",
      name:   product.name          ?? "",
      length: product.length?.toString() ?? "",
      price:  product.price?.toString()  ?? "",
      qtys:   Object.fromEntries(invs.map((i) => [i.id, String(i.quantityCurrent)])),
    });
    setError(null);
    setEditing(false);
  };

  const totalQty = invs.reduce((s, i) => s + i.quantityCurrent, 0);
  const status   = stockStatus(invs);

  if (editing) {
    return (
      <>
        <tr className="row-editing">
          <td><input className="input input-inline" value={form.sku}    onChange={set("sku")}    placeholder="Kodas" /></td>
          <td><input className="input input-inline" value={form.name}   onChange={set("name")}   placeholder="Pavadinimas" /></td>
          <td><input className="input input-inline" type="number" value={form.length} onChange={set("length")} placeholder="mm" style={{ width: 80 }} /></td>
          <td style={{ textAlign: "center" }}>
            {invs.length === 0 ? (
              <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {invs.map((inv) => (
                  <input
                    key={inv.id}
                    className="input input-inline"
                    type="number"
                    min={0}
                    value={form.qtys[inv.id] ?? inv.quantityCurrent}
                    onChange={setQty(inv.id)}
                    style={{ width: 70, textAlign: "center" }}
                  />
                ))}
              </div>
            )}
          </td>
          <td style={{ textAlign: "center" }}>
            <Badge variant={status === "green" ? "green" : status === "yellow" ? "yellow" : status === "red" ? "red" : "gray"}>
              {stockLabel(invs)}
            </Badge>
          </td>
          <td><input className="input input-inline" type="number" step="0.01" value={form.price} onChange={set("price")} placeholder="0.00" style={{ width: 90 }} /></td>
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
            <td colSpan={7}>
              <div className="alert alert-error" style={{ margin: "4px 0", padding: "6px 10px", fontSize: 12 }}>⚠ {error}</div>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={td()}>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-2)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>
          {product.sku || "—"}
        </span>
      </td>
      <td style={td()}>
        <span style={{ fontWeight: 500 }}>{product.name || "—"}</span>
      </td>
      <td style={{ ...td(), textAlign: "center", color: "var(--text-2)" }}>
        {product.length ?? "—"}
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <span style={{
          fontWeight: 700, fontSize: 15,
          color: status === "red" ? "var(--danger)" : status === "yellow" ? "#d97706" : "var(--text-1)",
        }}>
          {totalQty}
        </span>
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <Badge variant={status === "green" ? "green" : status === "yellow" ? "yellow" : status === "red" ? "red" : "gray"}>
          {stockLabel(invs)}
        </Badge>
      </td>
      <td style={{ ...td(), textAlign: "right", color: "var(--text-2)" }}>
        {product.price != null ? `${product.price.toFixed(2)} €` : "—"}
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setEditing(true)} className="btn btn-ghost btn-icon" title="Redaguoti">✏️</button>
          <button onClick={() => onDelete(product)} className="btn btn-ghost-danger btn-icon" title="Ištrinti">🗑️</button>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function CategoryMaterialsPage({ category }: { category: SystemCategory }) {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [inventory,    setInventory]    = useState<WarehouseInventory[]>([]);
  const [warehouses,   setWarehouses]   = useState<Warehouse[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [deleting,     setDeleting]     = useState<Product | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const meta = PAGE_META[category];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, inv, wh] = await Promise.all([
        productsApi.getAll(),
        warehouseInventoryApi.getAll(),
        warehousesApi.getAll(),
      ]);
      const allProds = p || [];
      const hasCategories = allProds.some(
        (prod) => prod.systemCategory !== undefined && prod.systemCategory !== null
      );
      setProducts(
        hasCategories
          ? allProds.filter((prod) => Number(prod.systemCategory) === Number(category))
          : allProds
      );
      setInventory(inv || []);
      setWarehouses(wh || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nepavyko įkelti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      await productsApi.delete(deleting.id);
      setDeleting(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Klaida trinant");
    } finally {
      setDeleteSaving(false);
    }
  };

  // warehouses used only for page-level stats — not shown per row anymore
  const _warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));
  void _warehouseMap;

  const invByProduct: Record<string, WarehouseInventory[]> = {};
  inventory.forEach((inv) => {
    if (!invByProduct[inv.productId]) invByProduct[inv.productId] = [];
    invByProduct[inv.productId].push(inv);
  });

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      return !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.sku ?? "").localeCompare(b.sku ?? ""));

  const lowCount   = products.filter((p) => stockStatus(invByProduct[p.id] ?? []) === "yellow").length;
  const emptyCount = products.filter((p) => stockStatus(invByProduct[p.id] ?? []) === "red").length;
  const goodCount  = products.filter((p) => stockStatus(invByProduct[p.id] ?? []) === "green").length;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "var(--text-3)" }}>
      Kraunama...
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            <span style={{ marginRight: 8 }}>{meta.icon}</span>{meta.title}
          </h1>
          <p className="page-subtitle">{meta.subtitle}</p>
        </div>
        <div className="page-header-actions">
          <input
            className="input"
            placeholder="Ieškoti pagal pavadinimą arba kodą…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Iš viso medžiagų" value={products.length} color="var(--brand)" />
        <StatCard label="Geras kiekis"      value={goodCount}       color="#16a34a" />
        <StatCard label="Mažas kiekis"      value={lowCount}        color="#d97706" />
        <StatCard label="Nėra"              value={emptyCount}      color="var(--danger)" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kodas</th>
              <th>Pavadinimas</th>
              <th style={{ textAlign: "center" }}>Ilgis, mm</th>
              <th style={{ textAlign: "center" }}>Kiekis</th>
              <th style={{ textAlign: "center" }}>Statusas</th>
              <th style={{ textAlign: "right" }}>Kaina €</th>
              <th style={{ textAlign: "center" }}>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="td-empty">{search ? "Nerasta pagal paiešką" : "Medžiagų nėra"}</td></tr>
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

      {deleting && (
        <Modal title="Ištrinti medžiagą" onClose={() => setDeleting(null)} size="sm">
          <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 0 }}>
            Ar tikrai norite ištrinti <strong>{deleting.name}</strong>? Šio veiksmo negalima atšaukti.
          </p>
          <div className="modal-footer">
            <button onClick={() => setDeleting(null)} className="btn btn-secondary">Atšaukti</button>
            <button onClick={handleDelete} disabled={deleteSaving} className="btn btn-danger">
              {deleteSaving ? "Trinama..." : "Ištrinti"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function stockStatus(invs: WarehouseInventory[]): "red" | "yellow" | "green" | "gray" {
  if (!invs || invs.length === 0) return "gray";
  const total    = invs.reduce((s, i) => s + i.quantityCurrent, 0);
  const minTotal = invs.reduce((s, i) => s + i.quantityMin, 0);
  if (total === 0)       return "red";
  if (total <= minTotal) return "yellow";
  return "green";
}

function stockLabel(invs: WarehouseInventory[]) {
  const s = stockStatus(invs);
  if (s === "red")    return "Nėra";
  if (s === "yellow") return "Mažas";
  if (s === "green")  return "Geras";
  return "—";
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: "16px 20px", marginTop: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function td(): React.CSSProperties {
  return { padding: "11px 12px", verticalAlign: "middle" };
}
