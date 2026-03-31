import type { AddOrderItemCommand, CreateOrderCommand, Order } from "../types";
import { apiFetch } from "./apiClient";

export const ordersApi = {
  getAll: () => apiFetch<Order[]>("/api/Orders"),

  getById: (id: string) => apiFetch<Order>(`/api/Orders/${id}`),

  create: (data: CreateOrderCommand) =>
    apiFetch<string>("/api/Orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  addItem: (orderId: string, data: AddOrderItemCommand) =>
    apiFetch<void>(`/api/Orders/${orderId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  complete: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/complete`, { method: "POST" }),

  reserve: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/complete`, { method: "POST" }), //after change to reserve endpoint, update this to `/api/Orders/${id}/reserve`

  /** Returns a 15-minute SAS download URL for the order's stored PDF. */
  getPdfUrl: (id: string) =>
    apiFetch<{ url: string }>(`/api/Orders/${id}/pdf-url`),
};
