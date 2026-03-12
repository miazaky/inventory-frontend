import { apiFetch } from "./apiClient";
import type {
  Product,
  CreateProductCommand,
  UpdateProductCommand,
} from "../types";

export const productsApi = {
  getAll: () => apiFetch<Product[]>("/api/Products"),

  getById: (id: string) => apiFetch<Product>(`/api/Products/${id}`),

  create: (data: CreateProductCommand) =>
    apiFetch<string>("/api/Products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProductCommand) =>
    apiFetch<void>(`/api/Products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/Products/${id}`, { method: "DELETE" }),

  bulkCreate: (data: CreateProductCommand[]) =>
    apiFetch<void>("/api/Products/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
