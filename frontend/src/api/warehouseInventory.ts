import { apiFetch } from "./apiClient";
import type {
  WarehouseInventory,
  CreateWarehouseInventoryCommand,
  UpdateWarehouseInventoryQuantityCommand,
} from "../types";

export const warehouseInventoryApi = {
  getAll: () => apiFetch<WarehouseInventory[]>("/api/WarehouseInventories"),

  getById: (id: string) =>
    apiFetch<WarehouseInventory>(`/api/WarehouseInventories/${id}`),

  getByProduct: (productId: string) =>
    apiFetch<WarehouseInventory[]>(
      `/api/WarehouseInventories/by-product/${productId}`
    ),

  getByWarehouse: (warehouseId: string) =>
    apiFetch<WarehouseInventory[]>(
      `/api/WarehouseInventories/by-warehouse/${warehouseId}`
    ),

  getLowStock: () =>
    apiFetch<WarehouseInventory[]>("/api/WarehouseInventories/low-stock"),

  create: (data: CreateWarehouseInventoryCommand) =>
    apiFetch<string>("/api/WarehouseInventories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateQuantity: (id: string, newQuantity: number) =>
    apiFetch<void>(`/api/WarehouseInventories/${id}/quantity`, {
      method: "PUT",
      body: JSON.stringify({ id, newQuantity }),
    }),

  bulkCreate: (data: CreateWarehouseInventoryCommand[]) =>
    apiFetch<void>("/api/WarehouseInventories/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
