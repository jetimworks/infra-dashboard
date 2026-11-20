import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { nginxApi } from "../api/nginx"
import { qk } from "../lib/query-keys"
import type { NginxSiteWriteResponse } from "../api/types"

/**
 * Sentinel for a disabled query. A leading underscore is rejected by the
 * backend's site-name rule, so this key can never alias a real file.
 */
const NO_SITE = "__none__"

/**
 * Nginx sites on a VPS.
 *
 * The list query carries every file's content. The single-site query is what
 * the editor refetches, because a host with many sites makes the list
 * expensive. Both are invalidated together after a write: the list's enabled
 * badges and the open file are views of the same two directories.
 */
export function useNginxSites(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? qk.instanceNginxSites(id)
      : ["instances", id, "nginx", "sites", NO_SITE],
    queryFn: () => nginxApi.listSites(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

/**
 * One site, freshly read.
 *
 * `retry: false` — a 404 means the file is gone and a 409 means the name is
 * not a regular file. Retrying either just delays the diagnosis. `staleTime: 0`
 * keeps a refetch honest when the operator asks for one before saving.
 */
export function useNginxSite(id: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey:
      id && name
        ? qk.instanceNginxSite(id, name)
        : ["instances", id, "nginx", "sites", NO_SITE],
    queryFn: () => nginxApi.getSite(id as string, name as string),
    enabled: Boolean(id && name),
    retry: false,
    staleTime: 0,
  })
}

/**
 * Saves a site. The backend runs `nginx -t` after the write, so this is slower
 * than a plain file save.
 *
 * No toast: `valid: false` is a 200 with the saved file on disk, and the page
 * renders that as a warning with nginx's own output instead of an error.
 */
export function useSaveNginxSite() {
  const qc = useQueryClient()
  return useMutation<
    NginxSiteWriteResponse,
    unknown,
    { id: string; name: string; content: string }
  >({
    mutationFn: ({ id, name, content }) =>
      nginxApi.saveSite(id, name, content),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceNginxSites(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
    },
  })
}

/**
 * Enable/disable both change the `sites-enabled` directory, so the list and
 * the open site are refetched. `changed: false` is still a success.
 */
function useToggleNginxSite(enable: boolean) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      enable ? nginxApi.enableSite(id, name) : nginxApi.disableSite(id, name),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceNginxSites(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
    },
  })
}

export function useEnableNginxSite() {
  return useToggleNginxSite(true)
}

export function useDisableNginxSite() {
  return useToggleNginxSite(false)
}

/**
 * Runs `nginx -t` against the whole configuration. No ledger row, no
 * invalidation — nothing on the host changes.
 */
export function useTestNginx() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => nginxApi.test(id),
  })
}

/** Reloads nginx. The page gates this on the last successful test. */
export function useReloadNginx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => nginxApi.reload(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
    },
  })
}
