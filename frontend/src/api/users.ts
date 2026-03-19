import type { User } from "../types";
import { apiFetch } from "./apiClient";

export const usersApi = {
  getAll: () => apiFetch<User[]>("/api/Users"),
};
