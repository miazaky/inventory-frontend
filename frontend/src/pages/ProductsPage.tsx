import { useEffect, useState } from "react";
import { productsApi } from "../api/products";
import type { Product, CreateProductCommand, UpdateProductCommand } from "../types";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";

interface ProductFormData {
  sku: string;
  name: string;
  length: string;
  description: string;
}

const emptyForm: ProductFormData = { sku: "", name: "", length: "", description: "" };

function ProductForm({
  initial, onSubmit, onCancel, loading,
}: {
  initial?: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ProductFormData>(initial ?? emptyForm);
  const set = (field: keyof ProductFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="form-stack">
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">SKU</label>
          <input className="input" value={form.sku} onChange={set("sku")} placeholder="pvz. SKU-001" />
        </div>
        <div className="form-group">
          <label className="form-label">Pavadinimas <span className="req">*</span></label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="Produkto pavadinimas" required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Ilgis (cm)</label>
        <input className="input" type="number" value={form.length} onChange={set("length")} placeholder="pvz. 120" />
      </div>
      {/* <div className="form-group">
        <label className="form-label">Aprašymas</label>
        <textarea className="input" rows={3} value={form.description} onChange={set("description")} placeholder="Neprivalomas aprašymas" />
      </div> */}
      <div className="modal-footer">
        <button onClick={onCancel} className="btn btn-secondary">Atšaukti</button>
        <button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="btn btn-primary">
          {loading ? "Saugoma..." : "Išsaugoti"}
        </button>
      </div>
    </div>
  );
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll();
      setProducts(data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form: ProductFormData) => {
    setSaving(true);
    try {
      const cmd: CreateProductCommand = {
        sku: form.sku || undefined,
        name: form.name,
        length: form.length ? Number(form.length) : undefined,
        description: form.description || undefined,
      };
      await productsApi.create(cmd);
      setShowAdd(false);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: ProductFormData) => {
    if (!editing) return;
    setSaving(true);
    try {
      const cmd: UpdateProductCommand = {
        id: editing.id,
        sku: form.sku || undefined,
        name: form.name,
        length: form.length ? Number(form.length) : undefined,
        // description: form.description || undefined,
      };
      await productsApi.update(editing.id, cmd);
      setEditing(null);
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

  const columns = [
    { key: "sku", header: "Kodas", render: (p: Product) => <span className="mono">{p.sku || "—"}</span> },
    { key: "name", header: "Pavadinimas", render: (p: Product) => <span style={{ fontWeight: 500 }}>{p.name || "—"}</span> },
    { key: "length", header: "Ilgis", render: (p: Product) => p.length != null ? `${p.length} cm` : "—" },
    // { key: "description", header: "Description", render: (p: Product) => <span className="text-gray-500 text-xs">{p.description || "—"}</span> },
    {
      key: "actions",
      header: "Veiksmai",
      render: (p: Product) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setEditing(p)} className="btn btn-ghost btn-icon" title="Redaguoti">✏️</button>
          <button onClick={() => setDeleting(p)} className="btn btn-ghost-danger btn-icon" title="Ištrinti">🗑️</button>
        </div>
      ),
    },
  ];

  const filteredProducts = products.filter((p) =>
    `${p.name ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Medžiagos</h1>
          {/* <p className="page-subtitle">{products.length} iš viso</p> */}
        </div>
        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Ieškoti pagal pavadinimą ar SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: 240 }}
          />
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Pridėti naują produktą</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      <Table columns={columns} data={filteredProducts} keyExtractor={(p) => p.id} loading={loading} emptyMessage="Produktų nerasta." />

      {showAdd && (
        <Modal title="Pridėti produktą" onClose={() => setShowAdd(false)}>
          <ProductForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Redaguoti produktą" onClose={() => setEditing(null)}>
          <ProductForm
            initial={{ sku: editing.sku || "", name: editing.name || "", length: editing.length?.toString() || "", description: editing.description || "" }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
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
