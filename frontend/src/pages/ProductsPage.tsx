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
  initial,
  onSubmit,
  onCancel,
  loading,
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input className="input" value={form.sku} onChange={set("sku")} placeholder="e.g. SKU-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="Product name" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
        <input className="input" type="number" value={form.length} onChange={set("length")} placeholder="e.g. 120" />
      </div>
      {/* <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="input resize-none" rows={3} value={form.description} onChange={set("description")} placeholder="Optional description" />
      </div> */}
      <div className="flex gap-3 pt-2 justify-end">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="btn-primary">
          {loading ? "Saving..." : "Save"}
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
    { key: "sku", header: "Kodas", render: (p: Product) => <span className="font-mono text-xs">{p.sku || "—"}</span> },
    { key: "name", header: "Pavadinimas", render: (p: Product) => <span className="font-medium">{p.name || "—"}</span> },
    { key: "length", header: "Ilgis", render: (p: Product) => p.length != null ? `${p.length} cm` : "—" },
    // { key: "description", header: "Description", render: (p: Product) => <span className="text-gray-500 text-xs">{p.description || "—"}</span> },
    {
      key: "actions",
      header: "Veiksmai",
      render: (p: Product) => (
        <div className="flex gap-2">
          <button onClick={() => setEditing(p)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Edit</button>
          <button onClick={() => setDeleting(p)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
        </div>
      ),
    },
  ];

  const filteredProducts = products.filter((p) =>
    `${p.name ?? ""} ${p.sku ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medžiagos</h1>
          {/* <p className="text-sm text-gray-500 mt-1">{products.length} total</p> */}
        </div>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Pridėti naują produktą</button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

      <Table columns={columns} data={filteredProducts} keyExtractor={(p) => p.id} loading={loading} emptyMessage="No products found." />

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)}>
          <ProductForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Product" onClose={() => setEditing(null)}>
          <ProductForm
            initial={{ sku: editing.sku || "", name: editing.name || "", length: editing.length?.toString() || "", description: editing.description || "" }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Product" onClose={() => setDeleting(null)} size="sm">
          <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{deleting.name}</strong>? This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleting(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="btn-danger">{saving ? "Deleting..." : "Delete"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
