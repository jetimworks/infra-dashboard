import { apiGet } from "./client"
import type { Action, ActionListParams, ActionListResponse } from "./types"

export const actionsApi = {
  list: (params?: ActionListParams) =>
    apiGet<ActionListResponse>("/actions", params),

  get: (id: string) => apiGet<Action>(`/actions/${id}`),

  listByInstance: (instanceId: string, params?: ActionListParams) =>
    apiGet<ActionListResponse>(`/instances/${instanceId}/actions`, params),
}
