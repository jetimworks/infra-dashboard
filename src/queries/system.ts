import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { systemApi } from "../api/system"
import { qk } from "../lib/query-keys"
import { DEFAULT_SWAP_PATH } from "../lib/ops-constants"

/**
 * Where the disk space went. Read-only, and safe to poll — it is a `df`
 * walk over a small set of mount points.
 *
 * `enabled` exists because these reads run over SSH. Only a VPS has SSH
 * credentials, so on any other instance the caller switches the query off
 * rather than firing it at a host that is not there.
 */
export function useDiskUsage(
  instanceId: string | undefined,
  options?: { path?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instanceDisk(instanceId, options?.path)
      : ["instances", instanceId, "disk", "usage", "noop"],
    queryFn: () => systemApi.disk(instanceId as string, options?.path),
    enabled: Boolean(instanceId) && options?.enabled !== false,
    staleTime: 30_000,
  })
}

/**
 * The largest files under a path.
 *
 * Read-only by design — the backend has no delete endpoint for files, and
 * neither does this UI.
 */
export function useDiskFiles(
  instanceId: string | undefined,
  options?: {
    path?: string
    minSizeMb?: number
    limit?: number
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instanceDiskFiles(
          instanceId,
          options?.path,
          options?.minSizeMb,
          options?.limit
        )
      : ["instances", instanceId, "disk", "files", "noop"],
    queryFn: () =>
      systemApi.diskFiles(instanceId as string, {
        path: options?.path,
        minSizeMb: options?.minSizeMb,
        limit: options?.limit,
      }),
    enabled: Boolean(instanceId) && options?.enabled !== false,
    staleTime: 60_000,
  })
}

/** Whether the host has swap, and whether it survives a reboot. */
export function useSwapStatus(
  instanceId: string | undefined,
  options?: { path?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instanceSwap(instanceId, options?.path)
      : ["instances", instanceId, "swap", "noop"],
    queryFn: () => systemApi.swapStatus(instanceId as string, options?.path),
    enabled: Boolean(instanceId) && options?.enabled !== false,
    staleTime: 30_000,
  })
}

/**
 * The path this instance's swap file lives at.
 *
 * The backend reads the real swap areas from `swapon`, so `exists` and the
 * memory totals are the same whatever path is asked for. The one
 * path-dependent reading is `in_fstab` — the backend checks whether THAT
 * path is in /etc/fstab. A host whose swap file is at /myswap, read at
 * /swapfile, reports a swap that will not survive a reboot when it will.
 *
 * So the path is remembered here rather than assumed. The swap panel writes
 * it after a create; the ops score reads it. They cannot disagree.
 */
export function useSwapPath(instanceId: string | undefined): string {
  const query = useQuery({
    queryKey: instanceId
      ? qk.instanceSwapPath(instanceId)
      : ["instances", instanceId, "swapPath", "noop"],
    queryFn: async () => DEFAULT_SWAP_PATH,
    initialData: DEFAULT_SWAP_PATH,
    // Never fetched from the server and never stale: this is a local
    // preference, not a resource.
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  return query.data ?? DEFAULT_SWAP_PATH
}

/** Remember where this instance's swap file lives. */
export function useSetSwapPath(
  instanceId: string | undefined
): (path: string) => void {
  const qc = useQueryClient()
  return (path: string) => {
    if (!instanceId) return
    qc.setQueryData(qk.instanceSwapPath(instanceId), path)
  }
}

/**
 * Every systemd unit on the host.
 *
 * The list is the whole inventory — dozens of units on a real host — but only
 * the curated seven may be acted on. That filter is applied at the render
 * boundary, not here, so the page can still show what else is running.
 */
export function useServices(
  instanceId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instanceServices(instanceId)
      : ["instances", instanceId, "services", "noop"],
    queryFn: () => systemApi.services(instanceId as string),
    enabled: Boolean(instanceId) && options?.enabled !== false,
    staleTime: 30_000,
  })
}

/**
 * Creates a swap file.
 *
 * No toast on error: the backend's refusals are the diagnosis. A 409 about
 * free space names three numbers — required, available, needed — and a
 * paraphrase would throw away the only useful part of the message. The page
 * renders it verbatim.
 */
export function useCreateSwap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      instanceId,
      sizeMb,
      path,
    }: {
      instanceId: string
      sizeMb: number
      path: string
    }) => systemApi.createSwap(instanceId, { size_mb: sizeMb, path }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceSwapRoot(vars.instanceId) })
      qc.invalidateQueries({ queryKey: qk.instanceDiskRoot(vars.instanceId) })
      qc.invalidateQueries({
        queryKey: qk.instanceActionsRoot(vars.instanceId),
      })
    },
  })
}

/**
 * Starts, stops, restarts or reloads a systemd unit.
 *
 * `unit` is the BASE name — "nginx", not "nginx.service".
 *
 * The endpoint answers HTTP 200 even when the command failed: the body then
 * carries `status: "UNKNOWN"` and the raw systemctl output. That is a
 * success from the network's point of view and a failure from the
 * operator's, so this hook treats it as a success and leaves the verdict to
 * the page, which renders the output verbatim.
 */
export function useControlService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      instanceId,
      unit,
      action,
    }: {
      instanceId: string
      unit: string
      action: string
    }) => systemApi.controlService(instanceId, unit, action),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: qk.instanceServices(vars.instanceId),
      })
      qc.invalidateQueries({
        queryKey: qk.instanceActionsRoot(vars.instanceId),
      })
    },
  })
}
