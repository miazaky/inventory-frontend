import { useEffect, useState } from "react";
import { dashboardApi } from "../api/dashboard";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { productsApi } from "../api/products";
import { warehousesApi } from "../api/warehouses";
import { Badge } from "../components/Badge";
import type { WarehouseInventory, Product, Warehouse } from "../types";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStock, setLowStock] = useState<WarehouseInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, w, ls] = await Promise.all([
          productsApi.getAll(),
          warehousesApi.getAll(),
          warehouseInventoryApi.getLowStock(),
        ]);
        setProducts(p || []);
        setWarehouses(w || []);
        setLowStock(Array.isArray(ls) ? ls : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard...
      </div>
    );
  if (error)
    return (
      <div className="p-6 text-red-500">Error: {error}</div>
    );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Inventory system overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Products"
          value={products.length}
          icon="📦"
          color="bg-indigo-50"
        />
        <StatCard
          label="Total Warehouses"
          value={warehouses.length}
          icon="🏭"
          color="bg-teal-50"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStock.length}
          icon="⚠️"
          color="bg-orange-50"
        />
      </div>

      {/* Low stock table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Low Stock Items</h2>
          {lowStock.length > 0 && (
            <Badge variant="red">{lowStock.length} alerts</Badge>
          )}
        </div>
        {lowStock.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            ✅ All stock levels are healthy
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Product ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Warehouse ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Current</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Min</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.productId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.warehouseId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{item.quantityCurrent}</td>
                  <td className="px-4 py-3 text-gray-600">{item.quantityMin}</td>
                  <td className="px-4 py-3">
                    <Badge variant="red">Low stock</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Warehouses list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Warehouses</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {warehouses.length === 0 ? (
            <p className="px-6 py-6 text-gray-400">No warehouses yet.</p>
          ) : (
            warehouses.map((w) => (
              <div key={w.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{w.name || "Unnamed"}</p>
                  <p className="text-xs text-gray-400">{w.location || "No location"}</p>
                </div>
                <Badge variant="blue">Active</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
