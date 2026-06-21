import { apiGet, apiPost, apiPut } from "./client"
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  User,
} from "./types"

export const adminApi = {
  listUsers: () => apiGet<User[]>("/admin/users"),
  createUser: (body: AdminCreateUserInput) =>
    apiPost<User, AdminCreateUserInput>("/admin/users", body),
  updateUser: (id: string, body: AdminUpdateUserInput) =>
    apiPut<User, AdminUpdateUserInput>(`/admin/users/${id}`, body),
}
