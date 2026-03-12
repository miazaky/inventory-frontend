import { useEffect, useState } from "react";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import type { Order, Product, Warehouse } from "../types";
import { Badge } from "../components/Badge";
import { SelectInput } from "../components/SelectInput";
import { Modal } from "../components/Modal";

export function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Create order
  const [newWarehouseId, setNewWarehouseId] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Active order
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loadOrderId, setLoadOrderId] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Add item
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ productId: "", quantity: "" });
  const [savingItem, setSavingItem] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([productsApi.getAll(), warehousesApi.getAll()]).then(([p, w]) => {
      setProducts(p || []);
      setWarehouses(w || []);
    });
  }, []);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name || w.id }));
  const productOptions = products.map((p) => ({ value: p.id, label: p.name || p.id }));

  const handleCreateOrder = async () => {
    if (!newWarehouseId) return;
    setCreatingOrder(true);
    setError(null);
    setSuccess(null);
    try {
      const id = await ordersApi.create({ warehouseId: newWarehouseId });
      const order = await ordersApi.getById(id);
      setActiveOrder(order);
      setSuccess(`Order created: ${id.slice(0, 8)}…`);
      setNewWarehouseId("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setCreatingOrder(false); }
  };

  const handleLoadOrder = async () => {
    if (!loadOrderId) return;
    setLoadingOrder(true);
    setError(null);
    try {
      const order = await ordersApi.getById(loadOrderId);
      setActiveOrder(order);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Order not found"); }
    finally { setLoadingOrder(false); }
  };

  const handleAddItem = async () => {
    if (!activeOrder) return;
    setSavingItem(true);
    setError(null);
    try {
      await ordersApi.addItem(activeOrder.id, {
        orderId: activeOrder.id,
        productId: itemForm.productId,
        quantity: Number(itemForm.quantity),
      });
      const refreshed = await ordersApi.getById(activeOrder.id);
      setActiveOrder(refreshed);
      setShowAddItem(false);
      setItemForm({ productId: "", quantity: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSavingItem(false); }
  };

  const handleComplete = async () => {
    if (!activeOrder) return;
    setCompleting(true);
    setError(null);
    try {
      await ordersApi.complete(activeOrder.id);
      const refreshed = await ordersApi.getById(activeOrder.id);
      setActiveOrder(refreshed);
      setSuccess("Order completed successfully!");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setCompleting(false); }
  };

  const statusVariant = (status: string | null) => {
    if (!status) return "gray";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "green";
    if (s.includes("pend")) return "yellow";
    return "blue";
  };

  const isCompleted = activeOrder?.status?.toLowerCase().includes("complete");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Create and manage outbound orders</p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">{success}</div>}

      {/* Create order */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Create New Order</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <SelectInput label="Warehouse" value={newWarehouseId} onChange={setNewWarehouseId} options={warehouseOptions} required />
          </div>
          <button onClick={handleCreateOrder} disabled={!newWarehouseId || creatingOrder} className="btn-primary">
            {creatingOrder ? "Creating…" : "Create Order"}
          </button>
        </div>
      </div>

      {/* Load existing order */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Load Existing Order</h2>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Paste order ID (UUID)"
            value={loadOrderId}
            onChange={(e) => setLoadOrderId(e.target.value)}
          />
          <button onClick={handleLoadOrder} disabled={!loadOrderId || loadingOrder} className="btn-secondary">
            {loadingOrder ? "Loading…" : "Load"}
          </button>
        </div>
      </div>

      {/* Active order */}
      {activeOrder && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Order <span className="font-mono text-sm text-gray-400">{activeOrder.id.slice(0, 8)}…</span></h2>
              <p className="text-sm text-gray-500 mt-0.5">{warehouseMap[activeOrder.warehouseId]?.name || activeOrder.warehouseId}</p>
            </div>
            <Badge variant={statusVariant(activeOrder.status)}>{activeOrder.status || "Unknown"}</Badge>
          </div>

          {/* Items */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Items ({activeOrder.items?.length || 0})</h3>
              {!isCompleted && (
                <button onClick={() => setShowAddItem(true)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">+ Add item</button>
              )}
            </div>

            {!activeOrder.items?.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">No items yet. Add products to this order.</p>
            ) : (
              <div className="space-y-2">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{productMap[item.productId]?.name || item.productId.slice(0, 8) + "…"}</span>
                    <span className="text-sm font-semibold text-gray-900">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isCompleted && (
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={handleComplete} disabled={completing || !activeOrder.items?.length} className="btn-primary bg-green-600 hover:bg-green-700 w-full justify-center">
                {completing ? "Completing…" : "✓ Complete Order"}
              </button>
            </div>
          )}
        </div>
      )}

      {showAddItem && (
        <Modal title="Add Item to Order" onClose={() => setShowAddItem(false)} size="sm">
          <div className="space-y-4">
            <SelectInput label="Product" value={itemForm.productId} onChange={(v) => setItemForm((f) => ({ ...f, productId: v }))} options={productOptions} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input className="input" type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowAddItem(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddItem} disabled={savingItem || !itemForm.productId || Number(itemForm.quantity) < 1} className="btn-primary">
                {savingItem ? "Adding…" : "Add Item"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
