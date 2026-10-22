import { apiDelete, apiGet, apiPost, apiPut } from "./client"
import type {
  AppControlInput,
  AppControlResponse,
  CreateInstanceInput,
  CreateLocalServiceInput,
  CreateRemoteServiceInput,
  DeployAppResponse,
  Instance,
  InstanceType,
  NginxLogContentResponse,
  NginxLogListResponse,
  SshKeyResponse,
  SshKeyUploadInput,
  SystemActionInput,
  SystemActionResponse,
  UpdateInstanceInput,
} from "./types"

export const instancesApi = {
  list: (params?: {
    project_id?: string
    type?: InstanceType
    parent_id?: string
  }) => apiGet<Instance[]>("/instances", params),

  get: (id: string) => apiGet<Instance>(`/instances/${id}`),

  create: (body: CreateInstanceInput) =>
    apiPost<Instance, CreateInstanceInput>("/instances", body),

  update: (id: string, body: UpdateInstanceInput) =>
    apiPut<Instance, UpdateInstanceInput>(`/instances/${id}`, body),

  remove: (id: string) =>
    apiDelete<{ message: string }>(`/instances/${id}`),

  uploadSshKey: (id: string, body: SshKeyUploadInput) =>
    apiPut<{ message: string }, SshKeyUploadInput>(
      `/instances/${id}/ssh-key`,
      body
    ),

  downloadSshKey: (id: string) =>
    apiGet<SshKeyResponse>(`/instances/${id}/ssh-key`),

  systemAction: (id: string, body: SystemActionInput) =>
    apiPost<SystemActionResponse, SystemActionInput>(
      `/instances/${id}/system-action`,
      body
    ),

  // Runs /root/deploy.sh on the VPS. Synchronous: the response IS the final
  // outcome — no polling. Empty body; script path is hardcoded by the backend.
  // The 180s axios timeout gives the backend's 120s server-side cap plus a grace
  // window so the UI errors out instead of hanging if the SSH leg stalls.
  deployApp: (id: string) =>
    apiPost<DeployAppResponse>(`/instances/${id}/deploy-app`, undefined, {
      timeout: 180_000,
    }),

  // Runs `sudo systemctl <action> <service>` on the VPS. Synchronous, VPS-only.
  // Which unit that is comes from the instance's service_name column; clients
  // can only pick the verb.
  // Same 180s timeout policy as deployApp; backend caps the SSH leg at ~120s.
  appControl: (id: string, body: AppControlInput) =>
    apiPost<AppControlResponse, AppControlInput>(
      `/instances/${id}/app-control`,
      body,
      { timeout: 180_000 }
    ),

  // Read-only: lists /var/log/nginx/. No audit row written.
  listNginxLogs: (id: string) =>
    apiGet<NginxLogListResponse>(`/instances/${id}/nginx-logs`),

  // Read-only: tails a single nginx log file. `lines` is optional; the
  // backend defaults to 100 and caps at 10000 (with `truncated: true`).
  // Filename is URL-encoded to keep path-traversal / shell metachars out
  // even though the backend re-validates with a strict regex.
  getNginxLog: (id: string, filename: string, lines?: number) =>
    apiGet<NginxLogContentResponse>(
      `/instances/${id}/nginx-logs/${encodeURIComponent(filename)}`,
      { lines }
    ),

  createLocalRedis: (id: string, body: CreateLocalServiceInput) =>
    apiPost<Instance, CreateLocalServiceInput>(
      `/instances/${id}/create-redis`,
      body
    ),

  createLocalRds: (id: string, body: CreateLocalServiceInput) =>
    apiPost<Instance, CreateLocalServiceInput>(
      `/instances/${id}/create-rds`,
      body
    ),

  createLocalStorage: (id: string, body: CreateLocalServiceInput) =>
    apiPost<Instance, CreateLocalServiceInput>(
      `/instances/${id}/create-storage`,
      body
    ),

  createRemoteRedis: (body: CreateRemoteServiceInput) =>
    apiPost<Instance, CreateRemoteServiceInput>("/instances", body),

  createRemoteRds: (body: CreateRemoteServiceInput) =>
    apiPost<Instance, CreateRemoteServiceInput>("/instances", body),

  createRemoteStorage: (body: CreateRemoteServiceInput) =>
    apiPost<Instance, CreateRemoteServiceInput>("/instances", body),
}
