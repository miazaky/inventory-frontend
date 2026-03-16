import { useEffect, useState, useCallback } from "react";
import { warehousesApi } from "../api/warehouses";
import type { Warehouse, CreateWarehouseCommand, UpdateWarehouseCommand } from "../types";
import { Modal } from "../components/Modal";

function WarehouseRow({
  warehouse,
  onSaved,
  onDelete,
}: {
  warehouse: Warehouse;
  onSaved: () => void;
  onDelete: (w: Warehouse) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: warehouse.name || "", location: warehouse.location || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: "name" | "location") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cmd: UpdateWarehouseCommand = {
        id: warehouse.id,
        name: form.name,
        location: form.location || undefined,
      };
      await warehousesApi.update(warehouse.id, cmd);
      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Klaida");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: warehouse.name || "", location: warehouse.location || "" });
    setError(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <>
        <tr className="row-editing">
          <td>
            <input
              className="input input-inline"
              value={form.name}
              onChange={set("name")}
              placeholder="Pavadinimas"
              autoFocus
            />
          </td>
          <td>
            <input
              className="input input-inline"
              value={form.location}
              onChange={set("location")}
              placeholder="pvz. Vilnius, Lietuva"
            />
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
            <td colSpan={3}>
              <div className="alert alert-error" style={{ margin: "4px 0", padding: "6px 10px", fontSize: 12 }}>⚠ {error}</div>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr>
      <td><span style={{ fontWeight: 500 }}>{warehouse.name || "—"}</span></td>
      <td><span style={{ color: "var(--text-2)" }}>{warehouse.location || "—"}</span></td>
      <td>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setEditing(true)} className="btn btn-ghost btn-icon" title="Redaguoti">✏️</button>
          <button onClick={() => onDelete(warehouse)} className="btn btn-ghost-danger btn-icon" title="Ištrinti">🗑️</button>
        </div>
      </td>
    </tr>
  );
}

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);

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

  const handleCreate = async () => {
    setSaving(true);
    try {
      const cmd: CreateWarehouseCommand = { name: addForm.name, location: addForm.location || undefined };
      await warehousesApi.create(cmd);
      setShowAdd(false);
      setAddForm({ name: "", location: "" });
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
      await warehousesApi.delete(deleting.id);
      setDeleting(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Sandėliai</h1>
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pavadinimas</th>
              <th>Vieta</th>
              <th>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="td-loading">Kraunama...</td></tr>
            ) : warehouses.length === 0 ? (
              <tr><td colSpan={3} className="td-empty">Sandėlių nerasta.</td></tr>
            ) : (
              warehouses.map((w) => (
                <WarehouseRow key={w.id} warehouse={w} onSaved={load} onDelete={setDeleting} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Pridėti sandėlį" onClose={() => { setShowAdd(false); setAddForm({ name: "", location: "" }); }} size="sm">
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Pavadinimas <span className="req">*</span></label>
              <input className="input" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sandėlio pavadinimas" />
            </div>
            <div className="form-group">
              <label className="form-label">Vieta</label>
              <input className="input" value={addForm.location} onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))} placeholder="pvz. Vilnius, Lietuva" />
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowAdd(false); setAddForm({ name: "", location: "" }); }} className="btn btn-secondary">Atšaukti</button>
              <button onClick={handleCreate} disabled={saving || !addForm.name} className="btn btn-primary">
                {saving ? "Saugoma..." : "Išsaugoti"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Ištrinti sandėlį" onClose={() => setDeleting(null)} size="sm">
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
