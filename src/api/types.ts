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

export type InstanceType = "VPS" | "REDIS" | "RDS" | "STORAGE"
export type UserStatus = "active" | "inactive" | "closed"
export type OnboardingStage = "CHANGE_PASSWORD" | "HOME" | null
export type ActionType =
  | "BACKUP"
  | "SECURITY_PATCH"
  | "SSL_RENEW"
  | "RESTORE"
  | "DEPLOY_APP"
  | "APP_CONTROL"
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
