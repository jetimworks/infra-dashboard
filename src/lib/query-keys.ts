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
  /**
   * The parent of every filtered ledger variant for one instance.
   *
   * A write that lands in the ledger has to invalidate every filter — the
   * activity tab, the progress tab and the release history each query the
   * same rows with different filters. TanStack matches keys by prefix, so
   * invalidating this root refreshes all of them at once.
   *
   * `instanceActions` itself is untouched: the Activity tab still queries
   * the key it always did. This root is only ever used as an invalidation
   * target, never as a query key.
   */
  instanceActionsRoot: (id: string) => ["instances", id, "actions"] as const,
  instanceNginxLogs: (id: string) => ["instances", id, "nginx-logs"] as const,
  instanceNginxLog: (id: string, filename: string, lines: number) =>
    ["instances", id, "nginx-logs", "content", { filename, lines }] as const,
  // `database` is part of the key, not decoration: ?database= changes the
  // response entirely, so without it two database choices on the schema
  // browser would collide in the cache and the second would render the first.
  instanceDbSchemas: (id: string, database?: string) =>
    ["instances", id, "db-schemas", { database: database ?? "" }] as const,

  actions: (filters?: object) =>
    ["actions", filters ?? {}] as const,
  action: (id: string) => ["actions", id] as const,

  actionRequests: (filters?: { project_id?: string; instance_id?: string }) =>
    ["actionRequests", filters ?? {}] as const,
  actionRequest: (id: string) => ["actionRequests", id] as const,

  // ── Releases ────────────────────────────────────────────────────────────
  // The list key carries its filters because `type` and `status` change the
  // rows, not the shape of the response. The root key sits above the filter
  // segment so invalidating it clears every filter at once without touching
  // the detail, log or diff queries, which live on sibling segments.
  instanceReleasesRoot: (id: string) =>
    ["instances", id, "releases", "list"] as const,
  instanceReleases: (
    id: string,
    filters?: { type?: string; status?: string; limit?: number; offset?: number }
  ) => [...qk.instanceReleasesRoot(id), filters ?? {}] as const,
  instanceRelease: (id: string, actionId: string) =>
    ["instances", id, "releases", "detail", actionId] as const,
  instanceReleaseLog: (id: string, actionId: string) =>
    ["instances", id, "releases", "log", actionId] as const,
  instanceReleaseDiff: (id: string, to: string, from?: string) =>
    ["instances", id, "releases", "diff", { to, from: from ?? "" }] as const,

  // ── System toolkit ──────────────────────────────────────────────────────
  instanceDiskRoot: (id: string) => ["instances", id, "disk"] as const,
  instanceDisk: (id: string, path?: string) =>
    [...qk.instanceDiskRoot(id), "usage", path ?? "/"] as const,
  instanceDiskFiles: (
    id: string,
    path?: string,
    minSizeMb?: number,
    limit?: number
  ) =>
    [
      ...qk.instanceDiskRoot(id),
      "files",
      { path: path ?? "/var", minSizeMb: minSizeMb ?? 100, limit: limit ?? 50 },
    ] as const,
  instanceSwapRoot: (id: string) => ["instances", id, "swap"] as const,
  instanceSwap: (id: string, path?: string) =>
    [...qk.instanceSwapRoot(id), path ?? "/swapfile"] as const,
  /**
   * The swap file's path on this instance.
   *
   * Deliberately NOT under `instanceSwapRoot`: the path is not server data,
   * it is the answer to "where did we put the swap file". The backend
   * defaults to /swapfile and almost every host uses it, but a host that
   * keeps it elsewhere has to be read at that path — otherwise the fstab
   * check looks for a file that was never created and reports a swap that is
   * not persistent when it is.
   */
  instanceSwapPath: (id: string) => ["instances", id, "swapPath"] as const,
  instanceServices: (id: string) => ["instances", id, "services"] as const,

  // ── VPS files & git ──────────────────────────────────────────────────────
  instanceAppDirectory: (id: string) =>
    ["instances", id, "app-directory"] as const,
  /**
   * The parent of every file read for one instance.
   *
   * A write invalidates this root so the listing, the open file and the .env
   * all refresh at once — they are all views of the same host.
   */
  instanceFilesRoot: (id: string) => ["instances", id, "files"] as const,
  /**
   * The path IS part of the key, not decoration: two directories in the
   * browser are two different responses, and without it the second renders
   * the first one's entries out of the cache.
   */
  instanceFiles: (id: string, path: string) =>
    [...qk.instanceFilesRoot(id), "list", path] as const,
  instanceFileContent: (id: string, path: string) =>
    [...qk.instanceFilesRoot(id), "content", path] as const,
  instanceEnv: (id: string) => ["instances", id, "files", "env"] as const,
  instanceGitRoot: (id: string) => ["instances", id, "git"] as const,
  instanceGitStatus: (id: string) =>
    [...qk.instanceGitRoot(id), "status"] as const,

  // ── Deployments ─────────────────────────────────────────────────────────
  deployments: () => ["deployments"] as const,
  deployment: (id: string) => ["deployments", id] as const,

  // ── Platform ────────────────────────────────────────────────────────────
  platformHealth: () => ["platform", "health"] as const,
  platformMetrics: () => ["platform", "metrics"] as const,

  adminUsers: () => ["admin", "users"] as const,
  adminUser: (id: string) => ["admin", "users", id] as const,
  adminProject: (id: string) => ["admin", "projects", id] as const,
  adminInstances: () => ["admin", "instances"] as const,
  adminActions: (filters?: object) => ["admin", "actions", filters ?? {}] as const,
  adminActionRequests: () => ["admin", "actionRequests"] as const,
  adminActionRequest: (id: string) => ["admin", "actionRequests", id] as const,
}
