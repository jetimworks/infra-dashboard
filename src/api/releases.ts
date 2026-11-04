import { apiGet, apiPost } from "./client"
import type {
  ReleaseAcceptedResponse,
  ReleaseDetail,
  ReleaseDiff,
  ReleasePage,
  PreDeployReport,
  ReleaseSummary,
} from "./types"

/**
 * The release pipeline.
 *
 * Every endpoint but the log wraps its payload in `{"data": …}`, and the
 * unwrapping happens HERE rather than in the components — one place to get
 * it right, and no component ever has to remember which endpoint is the
 * odd one out.
 *
 * The history is the exception: its envelope is flat (`data` is the array and
 * `total`/`limit`/`offset` are its siblings), so it is normalised into a
 * ReleasePage here.
 */
export const releasesApi = {
  /** The release history, newest first. */
  list: async (
    instanceId: string,
    params?: { type?: string; status?: string; limit?: number; offset?: number }
  ): Promise<ReleasePage> => {
    const res = await apiGet<{
      data: ReleaseSummary[] | null
      total: number
      limit: number
      offset: number
    }>(`/instances/${instanceId}/releases`, params)
    return {
      items: res.data ?? [],
      total: res.total ?? 0,
      limit: res.limit ?? 0,
      offset: res.offset ?? 0,
    }
  },

  /**
   * "What would change if I deployed this SHA?"
   *
   * `from` is optional — the backend compares against the commit that is
   * deployed now when it is left out, which is the common question.
   */
  diff: async (
    instanceId: string,
    to: string,
    from?: string
  ): Promise<ReleaseDiff> => {
    const res = await apiGet<{ data: ReleaseDiff }>(
      `/instances/${instanceId}/releases/diff`,
      { to, from }
    )
    return res.data
  },

  /**
   * "What would deploying this branch bring?" — a read-only preview. The
   * backend runs `git fetch` on the host and changes nothing else. `branch`
   * is optional; left out, the backend uses the instance's selected branch.
   */
  preDeploy: async (
    instanceId: string,
    branch?: string
  ): Promise<PreDeployReport> => {
    const res = await apiGet<{ data: PreDeployReport }>(
      `/instances/${instanceId}/releases/pre-deploy`,
      { branch: branch || undefined }
    )
    return res.data
  },

  /** Starts a release. The response is 202 and the pipeline runs in the background. */
  create: async (
    instanceId: string,
    sha: string
  ): Promise<ReleaseAcceptedResponse> => {
    const res = await apiPost<{ data: ReleaseAcceptedResponse }>(
      `/instances/${instanceId}/releases`,
      { sha }
    )
    return res.data
  },

  /** One release in full: its stages, their output and the deploy transcript. */
  get: async (
    instanceId: string,
    actionId: string
  ): Promise<ReleaseDetail> => {
    const res = await apiGet<{ data: ReleaseDetail }>(
      `/instances/${instanceId}/releases/${actionId}`
    )
    return res.data
  },

  /**
   * The deploy script's own output, as plain text.
   *
   * This endpoint is NOT JSON. It is fetched with `responseType: "text"` and
   * must never be JSON.parse'd — the log is whatever the build script
   * printed, which is not JSON.
   */
  log: async (instanceId: string, actionId: string): Promise<string> =>
    apiGet<string>(
      `/instances/${instanceId}/releases/${actionId}/log`,
      undefined,
      { responseType: "text" }
    ),

  /**
   * Re-deploys a previous release's commit.
   *
   * The named release must have succeeded. A 409 explains why — "only a
   * successful release can be rolled back to" — and that message is the
   * diagnosis, so it is rendered verbatim rather than paraphrased.
   */
  rollback: async (
    instanceId: string,
    actionId: string
  ): Promise<ReleaseAcceptedResponse> => {
    const res = await apiPost<{ data: ReleaseAcceptedResponse }>(
      `/instances/${instanceId}/releases/${actionId}/rollback`
    )
    return res.data
  },
}
