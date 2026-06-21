import { apiDelete, apiGet, apiPost, apiPut } from "./client"
import type {
  CreateInstanceInput,
  CreateLocalServiceInput,
  Instance,
  InstanceType,
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
}
