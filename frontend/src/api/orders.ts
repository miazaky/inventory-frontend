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
    apiFetch<void>(`/api/Orders/${id}/reserve`, { method: "POST" }),

  pause: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/pause`, { method: "POST" }),

  resume: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/resume`, { method: "POST" }),

  sendProposalEmail: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/send-proposal-email`, { method: "POST" }),

  getPdfUrl: (id: string) =>
    apiFetch<{ url: string }>(`/api/Orders/${id}/pdf-url`),

  delete: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}`, { method: "DELETE" }),

  updateStatus: (id: string, status: string) =>
    apiFetch<void>(`/api/Orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ id, newStatus: status }),
    }),

  sendClientProposalEmail: (id: string) =>
    apiFetch<void>(`/api/Orders/${id}/send-client-proposal-email`, { method: "POST" }),
};
