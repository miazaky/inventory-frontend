import { apiFetch } from "./apiClient";
import type { InventoryTransaction, CreateTransactionCommand } from "../types";

export const transactionsApi = {
  createInbound: (data: CreateTransactionCommand) =>
    apiFetch<string>("/api/InventoryTransactions/inbound", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createOutbound: (data: CreateTransactionCommand) =>
    apiFetch<string>("/api/InventoryTransactions/outbound", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getByProduct: (productId: string) =>
    apiFetch<InventoryTransaction[]>(
      `/api/InventoryTransactions/product/${productId}`
    ),

  getHistory: (productId: string) =>
    apiFetch<InventoryTransaction[]>(
      `/api/InventoryTransactions/history/${productId}`
    ),
};
