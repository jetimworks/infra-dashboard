import { useQuery } from "@tanstack/react-query"
import { securityApi } from "../api/security"
import { qk } from "../lib/query-keys"

/**
 * Friendly security check (the one rendered to customers). Stale 60s.
 * The "Check now" button forces a refetch with refresh=true.
 */
export function useSecurityCheck(id: string | undefined, refresh = false) {
  return useQuery({
    queryKey: id
      ? qk.instanceSecurityCheck(id)
      : ["instances", id, "security-check", "noop"],
    queryFn: () => securityApi.check(id as string, refresh),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

/** Admin-grade audit (raw server data). */
export function useSecurityAudit(id: string | undefined, refresh = false) {
  return useQuery({
    queryKey: id
      ? qk.instanceSecurityAudit(id)
      : ["instances", id, "security-audit", "noop"],
    queryFn: () => securityApi.audit(id as string, refresh),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useRdsSecurityAudit(id: string | undefined, refresh = false) {
  return useQuery({
    queryKey: id
      ? qk.instanceRdsSecurityAudit(id)
      : ["instances", id, "rds-security-audit", "noop"],
    queryFn: () => securityApi.rdsAudit(id as string, refresh),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}
