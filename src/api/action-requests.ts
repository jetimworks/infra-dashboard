import { apiDelete, apiGet, apiPost, apiPut } from "./client"
import type {
  ActionRequest,
  ActionRequestListResponse,
  AdminActionRequest,
  CreateActionRequestInput,
  UpdateActionRequestInput,
} from "./types"

export const actionRequestsApi = {
  list: (params?: { project_id?: string; instance_id?: string }) =>
    apiGet<ActionRequestListResponse>("/action-requests", params),
  get: (id: string) => apiGet<AdminActionRequest>(`/action-requests/${id}`),
  create: (body: CreateActionRequestInput) =>
    apiPost<ActionRequest, CreateActionRequestInput>("/action-requests", body),
  update: (id: string, body: UpdateActionRequestInput) =>
    apiPut<ActionRequest, UpdateActionRequestInput>(
      `/action-requests/${id}`,
      body
    ),
  delete: (id: string) =>
    apiDelete<{ message: string }>(`/action-requests/${id}`),
  addMessage: (id: string, message: string) =>
    apiPost<ActionRequest, { message: string }>(
      `/action-requests/${id}/messages`,
      { message }
    ),
  // Admin endpoints
  listAdmin: (params?: { page?: number; limit?: number; status?: string }) =>
    apiGet<{ data: AdminActionRequest[]; meta: { total: number; page: number; limit: number; total_pages: number } }>("/admin/action-requests", params),
}
