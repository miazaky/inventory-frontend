import { apiFetch } from "./apiClient";

// The API returns a dynamic summary object — using unknown until the shape is confirmed
export const dashboardApi = {
  getSummary: () => apiFetch<unknown>("/api/Dashboard/inventory-summary"),
};
