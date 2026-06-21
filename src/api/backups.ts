import { apiGet, apiPost } from "./client"
import type {
  ActionAcceptedResponse,
  BackupListResponse,
  RestoreBackupInput,
} from "./types"

export const backupsApi = {
  list: (id: string, limit = 50) =>
    apiGet<BackupListResponse>(`/instances/${id}/backups`, { limit }),

  trigger: (id: string) =>
    apiPost<ActionAcceptedResponse>(`/instances/${id}/backups`),

  restore: (id: string, filename: string) =>
    apiPost<ActionAcceptedResponse, RestoreBackupInput>(
      `/instances/${id}/backups/${filename}/restore`,
      { confirm: true }
    ),
}
