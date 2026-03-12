import { apiFetch } from "./apiClient";
import type { TransferInventoryCommand } from "../types";

export const transfersApi = {
  transfer: (data: TransferInventoryCommand) =>
    apiFetch<void>("/api/inventory/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
