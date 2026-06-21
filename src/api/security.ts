import { apiGet } from "./client"
import type {
  RdsSecurityAudit,
  SecurityAudit,
  SecurityCheck,
} from "./types"

export const securityApi = {
  check: (id: string, refresh = false) =>
    apiGet<SecurityCheck>(`/instances/${id}/security-check`, {
      refresh: refresh ? "true" : undefined,
    }),

  audit: (id: string, refresh = false) =>
    apiGet<SecurityAudit>(`/instances/${id}/security-audit`, {
      refresh: refresh ? "true" : undefined,
    }),

  rdsAudit: (id: string, refresh = false) =>
    apiGet<RdsSecurityAudit>(`/instances/${id}/rds-security-audit`, {
      refresh: refresh ? "true" : undefined,
    }),
}
