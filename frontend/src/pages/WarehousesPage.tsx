import { useEffect, useState, useCallback } from "react";
import { warehousesApi } from "../api/warehouses";
import type { Warehouse, CreateWarehouseCommand, UpdateWarehouseCommand } from "../types";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";

interface WarehouseFormData { name: string; location: string; }
const emptyForm: WarehouseFormData = { name: "", location: "" };

function WarehouseForm({ initial, onSubmit, onCancel, loading }: { initial?: WarehouseFormData; onSubmit: (d: WarehouseFormData) => void; onCancel: () => void; loading: boolean; }) {
  const [form, setForm] = useState<WarehouseFormData>(initial ?? emptyForm);
  const set = (f: keyof WarehouseFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }));

  return (
    <div className="form-stack">
      <div className="form-group">
        <label className="form-label">Pavadinimas <span className="req">*</span></label>
        <input className="input" value={form.name} onChange={set("name")} placeholder="Sandėlio pavadinimas" required />
      </div>
      <div className="form-group">
        <label className="form-label">Vieta</label>
        <input className="input" value={form.location} onChange={set("location")} placeholder="pvz. Vilnius, Lietuva" />
      </div>
      <div className="modal-footer">
        <button onClick={onCancel} className="btn btn-secondary">Atšaukti</button>
        <button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="btn btn-primary">
          {loading ? "Saugoma..." : "Išsaugoti"}
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
    { key: "name", header: "Pavadinimas", render: (w: Warehouse) => <span style={{ fontWeight: 500 }}>{w.name || "—"}</span> },
    { key: "location", header: "Vieta", render: (w: Warehouse) => <span style={{ color: "var(--text-2)" }}>{w.location || "—"}</span> },
    // { key: "id", header: "ID", render: (w: Warehouse) => <span className="mono">{w.id.slice(0, 8)}…</span> },
    {
      key: "actions", header: "Veiksmai",
      render: (w: Warehouse) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setEditing(w)} className="btn btn-ghost btn-icon" title="Redaguoti">✏️</button>
          <button onClick={() => setDeleting(w)} className="btn btn-ghost-danger btn-icon" title="Ištrinti">🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Sandėliai</h1>
          {/* <p className="page-subtitle">{warehouses.length} iš viso</p> */}
        </div>
        <div className="page-header-actions">
          <input
            className="input"
            placeholder="Ieškoti sandėlių..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Pridėti naują sandėlį</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      <Table columns={columns} data={warehouses} keyExtractor={(w) => w.id} loading={loading} emptyMessage="Sandėlių nerasta." />

      {showAdd && (
        <Modal title="Pridėti sandėlį" onClose={() => setShowAdd(false)} size="sm">
          <WarehouseForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Redaguoti sandėlį" onClose={() => setEditing(null)} size="sm">
          <WarehouseForm
            initial={{ name: editing.name || "", location: editing.location || "" }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Ištrinti sandėlį" onClose={() => setDeleting(null)} size="sm">
          <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 0 }}>
            Ar tikrai norite ištrinti <strong>{deleting.name}</strong>? Šio veiksmo negalima atšaukti.
          </p>
          <div className="modal-footer">
            <button onClick={() => setDeleting(null)} className="btn btn-secondary">Atšaukti</button>
            <button onClick={handleDelete} disabled={saving} className="btn btn-danger">{saving ? "Trinama..." : "Ištrinti"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
