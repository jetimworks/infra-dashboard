import { apiGet } from "./client"
import type { PlatformHealth } from "./types"

/**
 * The platform's own probes.
 *
 * `GET /health` is public and answers HTTP 503 with `status: "degraded"`
 * when the database or redis is unreachable. That 503 is a VALID ANSWER, not
 * a transport failure — it carries the detail the operator needs. So the
 * request accepts 503 as a success and the caller branches on the body's
 * `status` field.
 *
 * `GET /metrics` is admin-only Prometheus text exposition. It is not JSON
 * and is never parsed as JSON.
 */
export const platformApi = {
  health: async (): Promise<PlatformHealth> =>
    apiGet<PlatformHealth>("/health", undefined, {
      validateStatus: (status) => status === 200 || status === 503,
    }),

  /** The Prometheus exposition text. Admin-only. */
  metrics: async (): Promise<string> =>
    apiGet<string>("/metrics", undefined, { responseType: "text" }),
}
