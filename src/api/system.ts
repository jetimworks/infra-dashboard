import { apiGet, apiPost } from "./client"
import type {
  BigFilesResponse,
  DiskReport,
  ServiceControlResponse,
  ServiceUnit,
  SwapCreateResponse,
  SwapStatus,
} from "./types"

/**
 * The operating-system toolkit: where the disk space went, which files are
 * large, whether the host has swap, and which systemd units it is running.
 *
 * The reads work on any owned instance with SSH credentials. The two writes —
 * creating swap and controlling a unit — act on the whole host, so the
 * backend restricts them to VPS instances and the UI gates them the same way.
 */
export const systemApi = {
  /** Where the space on the host went. Read-only. */
  disk: async (instanceId: string, path?: string): Promise<DiskReport> => {
    const res = await apiGet<{ data: DiskReport }>(
      `/instances/${instanceId}/disk`,
      { path }
    )
    return res.data
  },

  /** The largest files under a path. Read-only — there is no delete here. */
  diskFiles: async (
    instanceId: string,
    params?: { path?: string; minSizeMb?: number; limit?: number }
  ): Promise<BigFilesResponse> => {
    const res = await apiGet<{ data: BigFilesResponse }>(
      `/instances/${instanceId}/disk/files`,
      params
    )
    return res.data
  },

  /** Whether the host has swap, and whether it survives a reboot. */
  swapStatus: async (
    instanceId: string,
    path?: string
  ): Promise<SwapStatus> => {
    const res = await apiGet<{ data: SwapStatus }>(
      `/instances/${instanceId}/swap`,
      { path }
    )
    return res.data
  },

  /**
   * Creates a swap file and activates it.
   *
   * `path` is REQUIRED in the body — the GET endpoint defaults it to
   * /swapfile but the POST endpoint does not, and omitting it is a 400.
   */
  createSwap: async (
    instanceId: string,
    body: { size_mb: number; path: string }
  ): Promise<SwapCreateResponse> => {
    const res = await apiPost<{ data: SwapCreateResponse }>(
      `/instances/${instanceId}/swap`,
      body
    )
    return res.data
  },

  /** Every systemd unit on the host. Only the curated seven may be acted on. */
  services: async (instanceId: string): Promise<ServiceUnit[]> => {
    const res = await apiGet<{ data: ServiceUnit[] | null }>(
      `/instances/${instanceId}/services`
    )
    return res.data ?? []
  },

  /**
   * Starts, stops, restarts or reloads one of the curated units.
   *
   * `unit` is the BASE name — "nginx", not "nginx.service". The backend
   * matches it exactly against its curated list, so the suffix has to be
   * stripped before the URL is built.
   *
   * The endpoint answers HTTP 200 even when the command failed: the body
   * then carries `status: "UNKNOWN"` and the raw systemctl output. Branch on
   * the status field, never on the response status.
   */
  controlService: async (
    instanceId: string,
    unit: string,
    action: string
  ): Promise<ServiceControlResponse> => {
    const res = await apiPost<{ data: ServiceControlResponse }>(
      `/instances/${instanceId}/services/${encodeURIComponent(unit)}`,
      { action }
    )
    return res.data
  },
}
