/**
 * Centralized TanStack Query key factory. Every query and mutation in the
 * app uses these helpers so invalidation and fetching cannot drift apart.
 */
export const qk = {
  me: () => ["me"] as const,

  projects: (filters?: { userId?: string }) => ["projects", filters ?? {}] as const,
  project: (id: string) => ["projects", id] as const,
  adminProjects: () => ["admin", "projects"] as const,

  instances: (filters?: { projectId?: string; type?: string; parentId?: string }) =>
    ["instances", filters ?? {}] as const,
  instance: (id: string) => ["instances", "detail", id] as const,
  instanceMetricsLatest: (id: string) =>
    ["instances", id, "metrics", "latest"] as const,
  instanceMetricsHistory: (
    id: string,
    metric: string,
    from?: string,
    to?: string
  ) =>
    ["instances", id, "metrics", "history", { metric, from, to }] as const,
  instanceSecurityCheck: (id: string) =>
    ["instances", id, "security-check"] as const,
  instanceSecurityAudit: (id: string) =>
    ["instances", id, "security-audit"] as const,
  instanceRdsSecurityAudit: (id: string) =>
    ["instances", id, "rds-security-audit"] as const,
  instanceBackups: (id: string) => ["instances", id, "backups"] as const,
  instanceSshKey: (id: string) => ["instances", id, "ssh-key"] as const,
  instanceActions: (id: string, filters?: object) =>
    ["instances", id, "actions", filters ?? {}] as const,

  actions: (filters?: object) =>
    ["actions", filters ?? {}] as const,
  action: (id: string) => ["actions", id] as const,

  actionRequests: (filters?: { project_id?: string; instance_id?: string }) =>
    ["actionRequests", filters ?? {}] as const,
  actionRequest: (id: string) => ["actionRequests", id] as const,

  adminUsers: () => ["admin", "users"] as const,
  adminActionRequests: () => ["admin", "actionRequests"] as const,
  adminActionRequest: (id: string) => ["admin", "actionRequests", id] as const,
}
