/**
 * Single source of truth for backend response/request shapes.
 *
 * Hand-written from the Bruno collection at
 * /Users/joshuaetim/Documents/bruno/infrastructure and cross-checked against
 * /Users/joshuaetim/go/src/jetimworks/infrastructure/infra-backend/internal/rest/*.go
 *
 * When the backend changes a field, update it here and re-check consumers.
 */

// ──────────────────────────────────────────────────────────────────────────
// Domain enums
// ──────────────────────────────────────────────────────────────────────────

/**
 * RDS and REMOTE_RDS are different things and the difference is load-bearing:
 *
 *   RDS        — a Postgres container reached THROUGH a parent VPS over SSH.
 *   REMOTE_RDS — a Postgres server somebody else provisioned, which the
 *                backend dials directly over TCP with its own credentials.
 *
 * `type === "RDS"` filters do not match a REMOTE_RDS row. Wherever the UI
 * enumerates types, REMOTE_RDS has to be enumerated too or the row silently
 * disappears — see lib/remote-db.ts for the rest of the contract.
 */
export type InstanceType = "VPS" | "REDIS" | "RDS" | "STORAGE" | "REMOTE_RDS"
export type UserStatus = "active" | "inactive" | "closed"
export type OnboardingStage = "CHANGE_PASSWORD" | "HOME" | null
export type ActionType =
  | "BACKUP"
  | "SECURITY_PATCH"
  | "SSL_RENEW"
  | "RESTORE"
  | "DEPLOY_APP"
  | "APP_CONTROL"
  | "RELEASE"
  | "ROLLBACK"
  | "SWAP_CREATE"
  | "SERVICE_CONTROL"
  | "DEPLOYMENT"
  | "FILE_EDIT"
  | "GIT_PULL"
  | "GIT_PUSH"
  | string
export type ActionStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED"
export type SecurityFindingStatus = "ok" | "warning" | "action_required"
export type SecurityOverallStatus =
  | "safe"
  | "needs_attention"
  | "action_required"
export type SystemActionVerb = "stop" | "start" | "restart" | "reload"
export type FindingCategory =
  | "trust"
  | "access"
  | "updates"
  | "data_protection"
  | string

// ──────────────────────────────────────────────────────────────────────────
// Auth / Users
// ──────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  phone: string | null
  first_name: string
  last_name: string
  status: UserStatus
  is_staff: boolean
  is_verified: boolean
  onboarding_stage: OnboardingStage
  last_logged_in: string | null
  created_at: string
}

export interface AuthLoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface AuthRefreshResponse {
  access_token: string
  refresh_token: string
}

export interface UpdateProfileInput {
  first_name?: string
  last_name?: string
  phone?: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

export interface AdminCreateUserInput {
  email: string
  phone: string
  first_name: string
  last_name: string
}

export interface AdminUpdateUserInput {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  status?: UserStatus
  is_staff?: boolean
  is_verified?: boolean
  onboarding_stage?: OnboardingStage
}

// ──────────────────────────────────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  total_allocated_ram: string
  total_storage_capacity: string
  server_ip_addresses: string
  instance_type: string
  billing_info: string
  cpu_details: string
  database_driver: string
  database_version: string
  redis_memory: string
  additional_info: string
  created_at: string
}

export interface ProjectCreateInput {
  user_id: string
  name: string
  description?: string
  total_allocated_ram?: string
  total_storage_capacity?: string
  server_ip_addresses?: string
  instance_type?: string
  billing_info?: string
  cpu_details?: string
  database_driver?: string
  database_version?: string
  redis_memory?: string
  additional_info?: string
}

export type ProjectUpdateInput = Partial<ProjectCreateInput>

// ──────────────────────────────────────────────────────────────────────────
// Instances
// ──────────────────────────────────────────────────────────────────────────

export type InstanceConfig = Record<string, unknown>

export interface Instance {
  id: string
  project_id: string
  type: InstanceType
  name: string
  host: string | null
  port: number | null
  username: string | null
  domain: string | null
  // VPS only — null for REDIS/RDS/STORAGE. Required at VPS creation. On edit,
  // "" writes an empty string but JSON null is a no-op, so send null to leave
  // the stored value alone.
  github_repo: string | null
  github_branch: string | null
  // VPS only — the systemd unit app-control acts on. The API returns the raw
  // stored value, so null means "unset" and is resolved to "goweb" by
  // resolveServiceName() in lib/service-name.ts. Note this inverts the rule
  // above: on the request side "" is what clears the column, not null.
  service_name: string | null
  config: InstanceConfig
  is_active: boolean
  is_local: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateInstanceInput {
  project_id: string
  type: InstanceType
  name: string
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  ssh_key?: string | null
  domain?: string | null
  // VPS-only; the backend silently drops these for non-VPS types.
  github_repo?: string | null
  github_branch?: string | null
  // Typed `string`, not `string | null`, unlike its siblings: omitting it (or
  // leaving it "") stores NULL, which is what makes the backend fall back to
  // "goweb". A JSON null here would be rejected by the compiler on purpose —
  // it reads as a harmless "leave alone" and silently does the opposite.
  service_name?: string
  config?: InstanceConfig
  is_active?: boolean
  is_local?: boolean
  parent_id?: string | null
}

export interface UpdateInstanceInput {
  name?: string
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  domain?: string | null
  github_repo?: string | null
  github_branch?: string | null
  // See CreateInstanceInput.service_name — "" clears the column to NULL,
  // null is not a legal value here.
  service_name?: string
  config?: InstanceConfig
  is_active?: boolean
}

export interface CreateLocalServiceInput {
  name: string
  host?: string
  config?: InstanceConfig
  is_local?: boolean
}

export interface CreateRemoteServiceInput {
  project_id: string
  name: string
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  domain?: string | null
  config?: InstanceConfig
  is_active?: boolean
  is_local: false
}

export interface SystemActionInput {
  action: SystemActionVerb
  service: string
}

export interface SystemActionResponse {
  message: string
  stdout: string
  stderr: string
}

/**
 * Outcome reported by /root/deploy.sh via its RESULT: marker. The HTTP call
 * itself always succeeds (200 OK when the request reaches the handler); this
 * field discriminates what the script actually did.
 */
export type DeployAppStatus = "SUCCESS" | "FAIL" | "UNKNOWN"

export interface DeployAppResponse {
  action_id: string
  status: DeployAppStatus
  reason: string
  output: string
}

// ── App Control (POST /instances/{id}/app-control) ─────────────────────
// Synchronous: the response IS the final outcome. The 4-way status enum
// combines verb outcomes (start/stop/restart → SUCCESS / UNKNOWN) with the
// state-reporting verb (status → ACTIVE / INACTIVE / UNKNOWN).
export type AppControlAction = "start" | "stop" | "restart" | "status"
export type AppControlStatus = "ACTIVE" | "INACTIVE" | "SUCCESS" | "UNKNOWN"

export interface AppControlInput {
  action: AppControlAction
}

export interface AppControlResponse {
  action_id: string
  status: AppControlStatus
  message: string
  output: string
}

// ── Nginx logs (GET /instances/{id}/nginx-logs[/{filename}]) ────────────
// Read-only. The list endpoint returns an enveloped array under `data`;
// per backend docs, the tail endpoint's `lines` is clamped server-side at
// 10000 (with `truncated: true` when capped).
export interface NginxLogFile {
  name: string
  size_bytes: number
  modified: string
}

export interface NginxLogListResponse {
  data: NginxLogFile[]
}

export interface NginxLogContentResponse {
  filename: string
  lines: number
  truncated: boolean
  content: string
}

export interface SshKeyUploadInput {
  ssh_key: string
}

export interface SshKeyResponse {
  ssh_key: string
}

// ──────────────────────────────────────────────────────────────────────────
// Remote database (REMOTE_RDS only)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Every failure the remote-database layer can classify, mirroring the Code
 * constants in infra-backend/internal/services/rdb/errors.go. The trailing
 * `| string` follows the house pattern used by ActionType and FindingCategory:
 * the backend is free to add a code, and an unrecognised one must render as
 * itself rather than become undefined.
 */
export type DbErrorCode =
  | "DB_CONFIG_INVALID"
  | "DB_UNREACHABLE"
  | "DB_TIMEOUT"
  | "DB_TLS_FAILED"
  | "DB_AUTH_FAILED"
  | "DB_DATABASE_NOT_FOUND"
  | "DB_SERVER_ERROR"
  | "DB_QUERY_FAILED"
  | string

/**
 * POST /instances/{id}/db/test-connection.
 *
 * HTTP 200 EVEN WHEN THE DIAL FAILS. The verdict is `connected`; the status
 * code only reports whether the request reached the database layer at all.
 * A client that treats non-2xx as failure will report a healthy database as
 * broken — so branch on `connected`, never on the response status.
 *
 * error_code and error are always present so a client never has to tell an
 * absent key from an empty one. error_code is "" on success, NOT "OK", so
 * there is exactly one representation of "no failure".
 */
export interface DbTestConnectionResponse {
  instance_id: string
  action_id: string
  connected: boolean
  database: string
  /** "" on failure. */
  server_version: string
  latency_ms: number
  error_code: DbErrorCode | ""
  /** Human-readable; "" on success. */
  error: string
}

/**
 * How pg_class.relkind is labelled for display, from rdb/catalog.go's
 * relKindLabel. Unlisted codes pass through unchanged in the backend so a
 * future relkind stays identifiable, hence the `| string`.
 */
export type DbRelationKind =
  | "table"
  | "partitioned_table"
  | "view"
  | "materialized_view"
  | "foreign_table"
  | string

export interface DbRelation {
  name: string
  kind: DbRelationKind
  size_bytes: number
  /**
   * pg_class.reltuples — the planner's statistics. Free to read, and
   * explicitly an ESTIMATE, not a count; a real count is a full table scan.
   * Render it as "≈412" and never as a bare number.
   */
  estimated_rows: number
}

export interface DbSchema {
  name: string
  /** Normalised to [] rather than null by the backend — safe to iterate. */
  tables: DbRelation[]
}

/**
 * GET /instances/{id}/db/schemas.
 *
 * Unlike the test endpoint this one returns real HTTP errors, because its job
 * is to return data: a failed lookup is a 502, a timeout a 504. error_code
 * and error are still carried inside the {"error": "..."} body, formatted
 * "DB_AUTH_FAILED: <message>".
 *
 * `truncated` is true when the response hit the backend's 5000-relation
 * budget, which is global across all schemas — the tree is then incomplete
 * and must say so rather than implying it is the whole database.
 */
export interface DbSchemasResponse {
  instance_id: string
  database: string
  /** Every connectable database on the server, for the picker. */
  databases: string[]
  schemas: DbSchema[]
  truncated: boolean
  error_code: DbErrorCode | ""
  error: string
}

// ──────────────────────────────────────────────────────────────────────────
// Metrics
// ──────────────────────────────────────────────────────────────────────────

export interface InstanceMetric {
  metric_name: string
  value: number | null
  success: boolean
  recorded_at: string
  error?: string
}

export type InstanceMetricsLatest = Record<string, InstanceMetric>

export interface InstanceMetricsHistoryParams {
  metric: string
  from?: string
  to?: string
  limit?: number
}

// ──────────────────────────────────────────────────────────────────────────
// Security
// ──────────────────────────────────────────────────────────────────────────

export interface SecurityFinding {
  category: FindingCategory
  title: string
  status: SecurityFindingStatus
  detail?: string
  action?: string
}

export interface SecurityCheck {
  instance_id: string
  instance_type: InstanceType
  overall_status: SecurityOverallStatus
  last_checked_at?: string
  findings: SecurityFinding[]
}

export interface SecurityAuditSsl {
  valid: boolean
  expires_at: string | null
}

export interface SecurityAuditFirewall {
  active: boolean
  rules: string[]
}

export interface SecurityAuditOs {
  kernel: string
  security_updates: number
}

export interface SecurityAuditRateLimit {
  enabled: boolean
  req_per_min: number
}

export interface SecurityAuditHsts {
  enabled: boolean
  max_age: number
}

export interface SecurityAuditBackup {
  encrypted: boolean
  path: string
}

export interface SecurityAuditDatabase {
  connections: number
  connection_max: number
  superusers: string[]
}

export interface SecurityAudit {
  instance_id: string
  run_at: string
  refreshed: boolean
  ssl: SecurityAuditSsl
  firewall: SecurityAuditFirewall
  ssh_failed_attempts_24h: number
  os: SecurityAuditOs
  rate_limit: SecurityAuditRateLimit
  hsts: SecurityAuditHsts
  backup: SecurityAuditBackup
  database: SecurityAuditDatabase
  listening_ports: string[]
  nginx_version: string
  last_security_patch_at: string | null
}

export interface RdsSecurityAudit {
  instance_id: string
  run_at: string
  refreshed: boolean
  backup_encrypted: boolean
  backup_path: string | null
  last_backup_at: string | null
  publicly_accessible: boolean
  ssl_enforced: boolean
  superuser_count: number
  superusers: string[] | null
  audit_logging_enabled: boolean
  audit_logging_config: string | null
  password_policy_enabled: boolean
  min_password_length: number
  extensions: string[] | null
  password_hashes_exposed: boolean
  buffer_cache_hit_ratio: number
}

// ──────────────────────────────────────────────────────────────────────────
// Backups
// ──────────────────────────────────────────────────────────────────────────

export interface BackupListItem {
  action_id: string
  status: ActionStatus
  type: InstanceType
  filename?: string
  size_bytes?: number
  started_at: string
  completed_at?: string | null
  error_message?: string | null
  rdb_path?: string
}

export interface BackupListResponse {
  data: BackupListItem[]
}

export interface RestoreBackupInput {
  confirm: true
}

// ──────────────────────────────────────────────────────────────────────────
// Actions (unified async job queue)
// ──────────────────────────────────────────────────────────────────────────

export interface Action {
  id: string
  instance_id: string
  action_type: ActionType
  status: ActionStatus
  started_at: string
  completed_at: string | null
  error_message: string | null
  metadata: Record<string, unknown>
  /**
   * Real COLUMNS, not metadata — only FILE_EDIT fills them. The activity feed
   * renders "edited .env" from the row itself rather than parsing the
   * metadata blob.
   */
  file_path?: string | null
  file_size?: number | null
  created_at: string
  updated_at: string
}

export interface ActionAcceptedResponse {
  action_id: string
  status: ActionStatus
  message: string
}

export interface ActionListResponse {
  data: Action[]
  total: number
  limit: number
  offset: number
}

export interface ActionListParams {
  limit?: number
  offset?: number
  action_type?: string
  status?: ActionStatus
  started_from?: string
  started_to?: string
}

// ──────────────────────────────────────────────────────────────────────────
// Action Requests
// ──────────────────────────────────────────────────────────────────────────

export type ActionRequestStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"

export interface AdminNote {
  sender_id: string
  sender_type: "user" | "admin"
  message: string
  created_at: string
}

export interface ActionRequest {
  id: string
  user_id: string
  project_id: string | null
  instance_id: string | null
  title: string
  description: string
  status: ActionRequestStatus
  admin_notes: AdminNote[]
  created_at: string
  updated_at: string
}

export interface ActionRequestListResponse {
  data: ActionRequest[]
}

export interface CreateActionRequestInput {
  title: string
  description: string
  project_id?: string | null
  instance_id?: string | null
}

export interface UpdateActionRequestInput {
  title?: string
  status?: ActionRequestStatus
}

// Admin view — nested objects instead of IDs
export interface AdminActionRequest {
  id: string
  user: User
  project: Project | null
  instance: Instance | null
  title: string
  description: string
  status: ActionRequestStatus
  admin_notes: AdminNote[]
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────────────────────────────────
// Releases
//
// The release pipeline is four stages that run over SSH. The list endpoint
// returns a summary of each stage; the detail endpoint returns the stage's
// own output as well.
//
// Two shapes carry the same pipeline and they are NOT interchangeable: the
// summary has `duration_seconds` and no `output`, the detail has `output` and
// no `duration_seconds`. Never mix the fields up.
//
// Several slice fields are `| null` because a nil Go slice marshals as JSON
// `null`, not `[]`. They are normalised at the render boundary with `?? []`.
// ──────────────────────────────────────────────────────────────────────────

export type ReleaseStageStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED"

export type ReleaseStageName =
  | "fetch"
  | "checkout"
  | "deploy"
  | "restore_branch"

/** One named section of the deploy script's output. */
export interface ReleaseSubStage {
  name: string
  output: string
}

/** A stage as it appears in the history list — no output. */
export interface ReleaseStageSummary {
  name: string
  status: ReleaseStageStatus
  exit_code: number
  started_at?: string
  completed_at?: string
}

/** A stage as it appears in the detail view — with the command's output. */
export interface ReleaseStage {
  name: string
  status: ReleaseStageStatus
  exit_code: number
  started_at?: string | null
  completed_at?: string | null
  /**
   * The command's stdout. Always present, but often empty — and a SKIPPED
   * stage carries the reason it was skipped here rather than in an error
   * field of its own.
   */
  output: string
  sub_stages?: ReleaseSubStage[] | null
}

export interface ReleaseSummary {
  id: string
  action_type: "RELEASE" | "ROLLBACK" | string
  status: ActionStatus
  sha: string
  previous_sha: string
  resolved_sha: string
  branch: string
  result: string
  reason: string
  trigger: string
  started_at: string
  completed_at?: string | null
  /** Only on the summary. The detail computes its own from the timestamps. */
  duration_seconds?: number | null
  error_message?: string | null
  stages: ReleaseStageSummary[] | null
}

export interface ReleaseDetail {
  id: string
  action_type: "RELEASE" | "ROLLBACK" | string
  status: ActionStatus
  sha: string
  resolved_sha: string
  previous_sha: string
  branch: string
  repo_path: string
  script_path: string
  result: string
  reason: string
  trigger: string
  user_id: string
  /** Absent on anything that is not a rollback. */
  rollback_of?: string
  started_at: string
  completed_at?: string | null
  error_message?: string | null
  stages: ReleaseStage[] | null
  deploy_output: string
  /**
   * The deploy stage's output split into named sections. The top-level field
   * always carries one entry whose `name` is empty — that is the preamble
   * before the first marker — so filter empty names before rendering.
   */
  sub_stages?: ReleaseSubStage[] | null
}

/** The 202 from a deploy or a rollback. */
export interface ReleaseAcceptedResponse {
  action_id: string
  status: string
  sha: string
  previous_sha: string
  warnings: string[] | null
}

/**
 * The release history.
 *
 * This one is a FLAT envelope — `data` is the array and `total`, `limit` and
 * `offset` are its siblings — not the `{"data": {...}}` shape the single-item
 * release endpoints use.
 */
export interface ReleaseListResponse {
  data: ReleaseSummary[] | null
  total: number
  limit: number
  offset: number
}

/**
 * The release history, normalised.
 *
 * The wire shape is a flat envelope whose `data` is the array; the API
 * module unwraps it into this so no consumer has to reach through `.data`.
 */
export interface ReleasePage {
  items: ReleaseSummary[]
  total: number
  limit: number
  offset: number
}

export interface ReleaseCommit {
  sha: string
  author: string
  date: string
  subject: string
}

/** One category of change worth a second look before it is deployed. */
export interface ReleaseRisk {
  code: string
  severity: "high" | "medium" | "low" | string
  message: string
  paths: string[] | null
}

export interface ReleaseDiff {
  from: string
  to: string
  resolved_sha: string
  current_sha: string
  commit_count: number
  commits: ReleaseCommit[] | null
  files_changed: number
  insertions: number
  deletions: number
  dirty: boolean
  dirty_entries: string[] | null
  risks: ReleaseRisk[] | null
  warnings: string[] | null
}

// ──────────────────────────────────────────────────────────────────────────
// System toolkit (disk, large files, swap, systemd)
// ──────────────────────────────────────────────────────────────────────────

export interface DiskUsage {
  filesystem: string
  total_bytes: number
  used_bytes: number
  available_bytes: number
  used_percent: number
  mount_point: string
}

export interface DirUsage {
  path: string
  size_bytes: number
}

export interface DiskReport {
  path: string
  filesystems: DiskUsage[] | null
  directories: DirUsage[] | null
  warnings: string[] | null
}

export interface BigFile {
  path: string
  size_bytes: number
  /** RFC 3339. */
  modified_at: string
}

export interface BigFilesResponse {
  path: string
  min_size_mb: number
  limit: number
  files: BigFile[] | null
}

export interface SwapArea {
  name: string
  size_bytes: number
  used_bytes: number
  priority: number
}

export interface FreeMemory {
  total_bytes: number
  used_bytes: number
  available_bytes: number
  swap_total_bytes: number
  swap_used_bytes: number
}

export interface SwapStatus {
  exists: boolean
  total_bytes: number
  used_bytes: number
  swappiness: number
  areas: SwapArea[] | null
  path: string
  /**
   * False means the swap file exists but is not in /etc/fstab, so it will be
   * gone after the next reboot. That is a warning, not a failure.
   */
  in_fstab: boolean
  memory: FreeMemory
  warnings: string[] | null
}

export interface SwapCreateResponse {
  action_id: string
  status: string
  path: string
  size_mb: number
  total_bytes: number
  output: string
  warnings: string[] | null
}

/** One systemd unit as the host reports it. `unit` is the full name. */
export interface ServiceUnit {
  unit: string
  load_state: string
  active_state: string
  sub_state: string
  description: string
}

/**
 * The outcome of a service-control call.
 *
 * `status` is the verdict, not the HTTP code: the endpoint answers 200 even
 * when the command failed, and then `status` is "UNKNOWN". Branch on the
 * status field, never on the response status.
 */
export interface ServiceControlResponse {
  action_id: string
  unit: string
  action: string
  status: string
  output: string
  warnings: string[] | null
}

// ──────────────────────────────────────────────────────────────────────────
// AI ops console
// ──────────────────────────────────────────────────────────────────────────

export type AiProposalType =
  | "deploy_release"
  | "rollback_release"
  | "service_control"
  | "swap_create"
  | string

export interface AiProposal {
  id: string
  type: AiProposalType
  params: Record<string, unknown>
  summary: string
  /** Proposals expire 15 minutes after they are made. */
  expires_at: string
}

export interface AiContextBlock {
  type: string
  title: string
  body: string
}

export interface AiChatResponse {
  reply: string
  /**
   * Writes only. A question the console answered by reading returns an
   * empty list plus a note explaining what it did instead — that is an
   * answer, not a failure.
   */
  proposed_actions: AiProposal[] | null
  context: AiContextBlock[] | null
  notes: string[] | null
  model_calls: number
}

// ──────────────────────────────────────────────────────────────────────────
// Deployments
//
// The request body is camelCase (instanceId, gitRepo) and the response object
// is snake_case. The acceptance response mixes both: `actionId` is camelCase
// while the deployment object carries `action_id`.
// ──────────────────────────────────────────────────────────────────────────

export type DeploymentFramework =
  | "react"
  | "vue"
  | "angular"
  | "nextjs"
  | "static"

export interface Deployment {
  id: string
  instance_id: string
  domain: string
  framework: DeploymentFramework | string
  git_repo: string
  branch: string
  app_path: string
  port?: number | null
  status: string
  action_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateDeploymentInput {
  instanceId: string
  domain: string
  gitRepo: string
  framework: DeploymentFramework
  branch?: string
  /** Required for `nextjs` and `static`. */
  port?: number
}

export interface DeploymentAcceptedResponse {
  id: string
  /** camelCase here, snake_case on the deployment object. */
  actionId: string
  status: string
  message: string
}

// ──────────────────────────────────────────────────────────────────────────
// Platform
// ──────────────────────────────────────────────────────────────────────────

export interface PlatformHealth {
  status: "ok" | "degraded" | string
  checks: {
    database: string
    redis: string
  }
  uptime_seconds: number
}

// ──────────────────────────────────────────────────────────────────────────
// VPS files, app directory & git
// ──────────────────────────────────────────────────────────────────────────

/**
 * Where the application lives on the instance.
 *
 * `source` is "config" when the instance configures the directory and
 * "default" when the platform's fallback applies. A default directory on a
 * production host usually means the operator never pointed the dashboard at
 * the right place.
 */
export type AppDirectorySource = "config" | "default"

export interface AppDirectory {
  path: string
  source: AppDirectorySource
  /** Non-empty when the configured path was REJECTED and the default was used. */
  warnings: string[]
}

/**
 * The three kinds of thing a directory can hold.
 *
 * The backend maps the shell's `stat` vocabulary ("regular file", "directory",
 * "symbolic link") onto these, because a frontend should not have to know
 * what `stat` calls a regular file.
 */
export type FileType = "file" | "directory" | "symlink"

export interface FileEntry {
  name: string
  type: FileType
  /**
   * On a DIRECTORY this is the directory inode's own size — 4096 on ext4 —
   * NOT the size of its contents. Only render it for "file" and "symlink".
   */
  size_bytes: number
  /** RFC 3339. */
  modified_at: string
  /** Permission bits in octal, as a string ("600", "755", "644"). */
  mode: string
}

export interface DirListing {
  path: string
  /** The directory to go "up" to. "/" at the root. */
  parent: string
  /** Never null — the backend sends an empty array instead. */
  entries: FileEntry[]
}

export interface FileContent {
  path: string
  /**
   * Empty when `binary` is true. A binary file is never served as text, so
   * that a GET → PUT round trip is exact — Go's JSON encoder would otherwise
   * replace invalid UTF-8 with U+FFFD and silently change the file.
   */
  content: string
  size_bytes: number
  modified_at: string
  mode: string
  binary: boolean
}

export interface FileWriteResult {
  /** Inside `data`, not beside it. Null when the write wrote no ledger row. */
  action_id?: string | null
  path: string
  size_bytes: number
  modified_at: string
  mode: string
  warnings: string[]
}

export interface GitStatus {
  repo_path: string
  branch: string
  sha: string
  /** `git status --porcelain` output, one entry per changed file. */
  dirty: string[]
  warnings: string[]
}

export interface GitPullResult {
  action_id?: string | null
  branch: string
  sha_before: string
  sha_after: string
  output: string
  warnings: string[]
}

export interface GitPushResult {
  /** Null on a "nothing to push" answer — no ledger row was written. */
  action_id?: string | null
  branch: string
  pushed: boolean
  /** Present only when `pushed` is false. */
  reason?: string
  sha_before: string
  sha_after: string
  files: string[]
  output: string
  warnings: string[]
}
