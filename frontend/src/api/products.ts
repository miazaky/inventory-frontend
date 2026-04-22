import { apiFetch } from "./apiClient";
import type { Product, CreateProductCommand, UpdateProductCommand } from "../types";
import { SystemCategory } from "../types";

export const GROUND_PRICE_PRODUCT_SKU_PREFIX = "__GROUND_PRICE__";

export function isGroundPriceProduct(product: Pick<Product, "sku"> | null | undefined) {
  return Boolean(product?.sku?.startsWith(GROUND_PRICE_PRODUCT_SKU_PREFIX));
}

export const productsApi = {
  getAll: () => apiFetch<Product[]>("/api/Products"),

  getByCategory: (category: SystemCategory) =>
    apiFetch<Product[]>(`/api/Products?category=${category}`),

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
