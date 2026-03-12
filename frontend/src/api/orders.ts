import type { AddOrderItemCommand, CreateOrderCommand, Order } from "../types";
import { apiFetch } from "./apiClient";

export const ordersApi = {
  create: (data: CreateOrderCommand) =>
    apiFetch<string>("/api/Orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getById: (id: string) => apiFetch<Order>(`/api/Orders/${id}`),

  addItem: (orderId: string, data: AddOrderItemCommand) =>
    apiFetch<void>(`/api/Orders/${orderId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  complete: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/complete`, { method: "POST" }),
};
