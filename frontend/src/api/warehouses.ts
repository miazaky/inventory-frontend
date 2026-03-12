import { apiFetch } from "./apiClient";
import type {
  Warehouse,
  CreateWarehouseCommand,
  UpdateWarehouseCommand,
} from "../types";

export const warehousesApi = {
  getAll: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.pageSize !== undefined)
      query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiFetch<Warehouse[]>(`/api/warehouses${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) => apiFetch<Warehouse>(`/api/warehouses/${id}`),

  create: (data: CreateWarehouseCommand) =>
    apiFetch<string>("/api/warehouses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateWarehouseCommand) =>
    apiFetch<void>(`/api/warehouses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/warehouses/${id}`, { method: "DELETE" }),
};
