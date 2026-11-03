import { apiDelete, apiGet, apiPost } from "./client"
import type {
  CreateDeploymentInput,
  Deployment,
  DeploymentAcceptedResponse,
} from "./types"

/**
 * Deployments — an application running on a VPS, deployed from a git repo.
 *
 * The response shapes here are mixed and the mixing is easy to get wrong:
 *
 *   GET  /deployments            → `{"data": [...]}`  (enveloped)
 *   GET  /deployments/{id}       → the object itself  (bare)
 *   POST /deployments            → the object itself  (bare)
 *   POST /deployments/{id}/redeploy → the object itself (bare)
 *   DELETE /deployments/{id}     → the object itself  (bare)
 *
 * And the request body is camelCase — `instanceId`, `gitRepo` — while the
 * deployment object is snake_case. The acceptance response mixes both:
 * `actionId` is camelCase there, `action_id` on the object.
 */
export const deploymentsApi = {
  /** Every deployment the caller owns. */
  list: async (): Promise<Deployment[]> => {
    const res = await apiGet<{ data: Deployment[] | null }>("/deployments")
    return res.data ?? []
  },

  /** One deployment, in full. */
  get: async (id: string): Promise<Deployment> =>
    apiGet<Deployment>(`/deployments/${id}`),

  /** Starts a deployment. The response is 202 and the work runs in the background. */
  create: async (body: CreateDeploymentInput): Promise<DeploymentAcceptedResponse> =>
    apiPost<DeploymentAcceptedResponse, CreateDeploymentInput>(
      "/deployments",
      body
    ),

  /** Undeploys the application. The response is 202. */
  remove: async (id: string): Promise<DeploymentAcceptedResponse> =>
    apiDelete<DeploymentAcceptedResponse>(`/deployments/${id}`),

  /** Re-runs the deployment with its stored settings. The response is 202. */
  redeploy: async (id: string): Promise<DeploymentAcceptedResponse> =>
    apiPost<DeploymentAcceptedResponse>(`/deployments/${id}/redeploy`),
}
