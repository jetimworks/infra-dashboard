import { apiPost } from "./client"
import type { ActionAcceptedResponse } from "./types"

export const sslApi = {
  renew: (id: string) =>
    apiPost<ActionAcceptedResponse>(`/instances/${id}/ssl/renew`),
}
