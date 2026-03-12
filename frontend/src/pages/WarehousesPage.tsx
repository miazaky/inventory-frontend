import { useEffect, useState, useCallback } from "react";
import { warehousesApi } from "../api/warehouses";
import type { Warehouse, CreateWarehouseCommand, UpdateWarehouseCommand } from "../types";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";

interface WarehouseFormData { name: string; location: string; }
const emptyForm: WarehouseFormData = { name: "", location: "" };

function WarehouseForm({
  initial, onSubmit, onCancel, loading,
}: {
  initial?: WarehouseFormData;
  onSubmit: (d: WarehouseFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<WarehouseFormData>(initial ?? emptyForm);
  const set = (f: keyof WarehouseFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
        <input className="input" value={form.name} onChange={set("name")} placeholder="Warehouse name" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input className="input" value={form.location} onChange={set("location")} placeholder="e.g. Warsaw, Poland" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="btn-primary">
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await warehousesApi.getAll({ search: search || undefined });
      setWarehouses(data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: WarehouseFormData) => {
    setSaving(true);
    try {
      const cmd: CreateWarehouseCommand = { name: form.name, location: form.location || undefined };
      await warehousesApi.create(cmd);
      setShowAdd(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (form: WarehouseFormData) => {
    if (!editing) return;
    setSaving(true);
    try {
      const cmd: UpdateWarehouseCommand = { id: editing.id, name: form.name, location: form.location || undefined };
      await warehousesApi.update(editing.id, cmd);
      setEditing(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await warehousesApi.delete(deleting.id);
      setDeleting(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: "name", header: "Pavadinimas", render: (w: Warehouse) => <span className="font-medium">{w.name || "—"}</span> },
    { key: "location", header: "Vieta", render: (w: Warehouse) => w.location || "—" },
    // { key: "id", header: "ID", render: (w: Warehouse) => <span className="font-mono text-xs text-gray-400">{w.id.slice(0, 8)}…</span> },
    {
      key: "actions", header: "Veiksmai",
      render: (w: Warehouse) => (
        <div className="flex gap-2">
          <button onClick={() => setEditing(w)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Edit</button>
          <button onClick={() => setDeleting(w)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sandėliai</h1>
          {/* <p className="text-sm text-gray-500 mt-1">{warehouses.length} total</p> */}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Pridėti naują sandėlį</button>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Ieškoti sandėlių..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

      <Table columns={columns} data={warehouses} keyExtractor={(w) => w.id} loading={loading} emptyMessage="No warehouses found." />

      {showAdd && (
        <Modal title="Add Warehouse" onClose={() => setShowAdd(false)} size="sm">
          <WarehouseForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Warehouse" onClose={() => setEditing(null)} size="sm">
          <WarehouseForm
            initial={{ name: editing.name || "", location: editing.location || "" }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Warehouse" onClose={() => setDeleting(null)} size="sm">
          <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{deleting.name}</strong>?</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleting(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="btn-danger">{saving ? "Deleting..." : "Delete"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
