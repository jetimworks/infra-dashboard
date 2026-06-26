import { apiDelete, apiGet, apiPost, apiPut } from "./client"
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  User,
  Instance,
  ActionListResponse,
  ActionListParams,
} from "./types"

export const adminApi = {
  listUsers: () => apiGet<User[]>("/admin/users"),
  createUser: (body: AdminCreateUserInput) =>
    apiPost<User, AdminCreateUserInput>("/admin/users", body),
  updateUser: (id: string, body: AdminUpdateUserInput) =>
    apiPut<User, AdminUpdateUserInput>(`/admin/users/${id}`, body),
  deleteUser: (id: string) =>
    apiDelete<{ message: string }>(`/admin/users/${id}`),
  listInstances: () => apiGet<Instance[]>("/instances", { view: "admin" }),
  listActions: (params?: ActionListParams) =>
    apiGet<ActionListResponse>("/actions", { ...params, view: "admin" }),
}
