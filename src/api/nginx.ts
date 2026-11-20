import { apiGet, apiPost, apiPut } from "./client"
import type {
  NginxReloadResponse,
  NginxSite,
  NginxSitesResponse,
  NginxSiteToggleResponse,
  NginxSiteWriteResponse,
  NginxTestResponse,
} from "./types"

/**
 * Nginx site configuration on a VPS.
 *
 * Every response wraps its payload in `{"data": …}` and the unwrapping happens
 * here, exactly like the files API. Every write is owner-scoped and VPS-only.
 *
 * Two response shapes are verdicts rather than errors, and the caller must
 * branch on the body rather than the HTTP status:
 *
 *   PUT   …/sites/{name}  → 200 with `valid: false` when nginx rejects the
 *                            saved file. The file was written.
 *   POST  …/reload        → 200 with `reloaded: false` when nginx refuses.
 *                            The command ran; the old config stays live.
 */
const base = (instanceId: string) => `/instances/${instanceId}/nginx`

export const nginxApi = {
  /** Reads every file in /etc/nginx/sites-available, content included. */
  listSites: async (instanceId: string): Promise<NginxSitesResponse> => {
    const res = await apiGet<{ data: NginxSitesResponse }>(
      `${base(instanceId)}/sites`
    )
    return res.data
  },

  /** Reads one site. Prefer this when refreshing a single file. */
  getSite: async (
    instanceId: string,
    name: string
  ): Promise<NginxSite> => {
    const res = await apiGet<{ data: NginxSite }>(
      `${base(instanceId)}/sites/${encodeURIComponent(name)}`
    )
    return res.data
  },

  /**
   * Creates or replaces a site, then runs `nginx -t`.
   *
   * A `valid: false` response is a successful save: the file is on disk so the
   * operator can fix it. It must not be treated as an error.
   */
  saveSite: async (
    instanceId: string,
    name: string,
    content: string
  ): Promise<NginxSiteWriteResponse> => {
    const res = await apiPut<{ data: NginxSiteWriteResponse }>(
      `${base(instanceId)}/sites/${encodeURIComponent(name)}`,
      { content }
    )
    return res.data
  },

  /** Symlinks the site into /etc/nginx/sites-enabled. */
  enableSite: async (
    instanceId: string,
    name: string
  ): Promise<NginxSiteToggleResponse> => {
    const res = await apiPost<{ data: NginxSiteToggleResponse }>(
      `${base(instanceId)}/sites/${encodeURIComponent(name)}/enable`
    )
    return res.data
  },

  /**
   * Removes the /etc/nginx/sites-enabled symlink.
   *
   * A name with no link at all is a success with `changed: false`.
   */
  disableSite: async (
    instanceId: string,
    name: string
  ): Promise<NginxSiteToggleResponse> => {
    const res = await apiPost<{ data: NginxSiteToggleResponse }>(
      `${base(instanceId)}/sites/${encodeURIComponent(name)}/disable`
    )
    return res.data
  },

  /** Runs `sudo -n nginx -t` against the ENTIRE configuration. */
  test: async (instanceId: string): Promise<NginxTestResponse> => {
    const res = await apiPost<{ data: NginxTestResponse }>(
      `${base(instanceId)}/test`
    )
    return res.data
  },

  /** Runs `sudo -n nginx -s reload`. Does not test first. */
  reload: async (instanceId: string): Promise<NginxReloadResponse> => {
    const res = await apiPost<{ data: NginxReloadResponse }>(
      `${base(instanceId)}/reload`
    )
    return res.data
  },
}
