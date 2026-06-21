import { apiDelete, apiGet, apiPost, apiPut } from "./client"
import type {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
} from "./types"

export const projectsApi = {
  list: (params?: { user_id?: string }) =>
    apiGet<Project[]>("/projects", params),
  get: (id: string) => apiGet<Project>(`/projects/${id}`),
  create: (body: ProjectCreateInput) =>
    apiPost<Project, ProjectCreateInput>("/projects", body),
  update: (id: string, body: ProjectUpdateInput) =>
    apiPut<Project, ProjectUpdateInput>(`/projects/${id}`, body),
  remove: (id: string) => apiDelete<{ message: string }>(`/projects/${id}`),
}
