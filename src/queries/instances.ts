import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { instancesApi } from "../api/instances"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type {
  AppControlInput,
  CreateInstanceInput,
  CreateLocalServiceInput,
  CreateRemoteServiceInput,
  InstanceType,
  SshKeyUploadInput,
  SystemActionInput,
  UpdateInstanceInput,
} from "../api/types"

export function useInstances(filters?: {
  projectId?: string
  type?: InstanceType
  parentId?: string
}) {
  return useQuery({
    queryKey: qk.instances(filters),
    queryFn: () => instancesApi.list(filters),
    staleTime: 30_000,
  })
}

export function useInstance(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.instance(id) : ["instances", "detail", "noop"],
    queryFn: () => instancesApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useCreateInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateInstanceInput) => instancesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Server added")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useCreateLocalService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      parentId,
      body,
    }: {
      type: Exclude<InstanceType, "VPS">
      parentId: string
      body: CreateLocalServiceInput
    }) => {
      if (type === "REDIS") return instancesApi.createLocalRedis(parentId, body)
      if (type === "RDS") return instancesApi.createLocalRds(parentId, body)
      return instancesApi.createLocalStorage(parentId, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Service added")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useCreateRemoteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      body,
    }: {
      type: Exclude<InstanceType, "VPS">
      body: CreateRemoteServiceInput
    }) => {
      if (type === "REDIS") return instancesApi.createRemoteRedis(body)
      if (type === "RDS") return instancesApi.createRemoteRds(body)
      return instancesApi.createRemoteStorage(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Service added")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUpdateInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInstanceInput }) =>
      instancesApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      qc.invalidateQueries({ queryKey: qk.instance(vars.id) })
      toast.success("Server updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

/**
 * Sets the SSH root password on an instance. Deliberately does NOT invalidate
 * any query: the backend never returns the password, so nothing in the cached
 * instance payload changes when it is set.
 *
 * The backend treats an empty password as "leave unchanged", so callers must
 * not invoke this with a blank value.
 */
export function useUpdateInstancePassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      instancesApi.update(id, { password }),
    onSuccess: () => {
      toast.success("Password updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useDeactivateInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      instancesApi.update(id, { is_active: isActive }),
    // Optimistic flip so the toggle feels instant.
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: qk.instance(id) })
      const previous = qc.getQueryData(qk.instance(id))
      qc.setQueryData(qk.instance(id), (old: unknown) => {
        if (!old || typeof old !== "object") return old
        return { ...(old as Record<string, unknown>), is_active: isActive }
      })
      return { previous }
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(qk.instance(vars.id), context.previous)
      }
      toast.error(normalizeError(err).message)
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: qk.instance(vars.id) })
      qc.invalidateQueries({ queryKey: ["instances"] })
    },
  })
}

export function useDeleteInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => instancesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Server removed")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUploadSshKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SshKeyUploadInput }) =>
      instancesApi.uploadSshKey(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceSshKey(vars.id) })
      toast.success("SSH key updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useDownloadSshKey(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.instanceSshKey(id) : ["instances", id, "ssh-key", "noop"],
    queryFn: () => instancesApi.downloadSshKey(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}

export function useSystemAction() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SystemActionInput }) =>
      instancesApi.systemAction(id, body),
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

/**
 * Synchronous deploy on a VPS. The response IS the final outcome — no polling.
 * The page handles UX inline (status banner, output block, error mapping);
 * we intentionally do not toast on error so the page can render rich context.
 */
export function useDeployApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => instancesApi.deployApp(id),
    onSuccess: (_data, id) => {
      // The audit row lands in /instances/{id}/actions; refresh it so the
      // activity feed + recent-deploys list pick up the new entry immediately.
      qc.invalidateQueries({ queryKey: qk.instanceActions(id) })
    },
  })
}

/**
 * Synchronous app-control action (start / stop / restart / status) on a VPS's
 * systemd service — the instance's service_name, defaulting to "goweb". Same
 * shape as useDeployApp: 200 OK IS the outcome, no polling. Pages render rich
 * context inline — no toast on error.
 */
export function useAppControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AppControlInput }) =>
      instancesApi.appControl(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceActions(vars.id) })
    },
  })
}

/**
 * Snapshot list of files in /var/log/nginx/ on a VPS. No polling driven by
 * this hook — the page either drives polling itself (for the tail) or lets
 * the user hit a refresh button (for the file list). 30s staleTime so
 * round-trip navigation doesn't re-fetch.
 */
export function useNginxLogList(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? qk.instanceNginxLogs(id)
      : ["instances", id, "nginx-logs", "noop"],
    queryFn: () => instancesApi.listNginxLogs(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

/**
 * Tail snapshot for a single nginx log file. The page drives 5s polling
 * itself via a setInterval (with pause/visibility gating) so this hook
 * stays dumb. We leave `staleTime: 0` so the page's refetch always fires
 * regardless of when it last succeeded. `.gz` files are excluded so we
 * never try to render raw gzip bytes as text.
 */
export function useNginxLogContent(
  id: string | undefined,
  filename: string | undefined,
  lines: number
) {
  return useQuery({
    queryKey:
      id && filename
        ? qk.instanceNginxLog(id, filename, lines)
        : ["instances", id, "nginx-logs", "content", "noop"],
    queryFn: () =>
      instancesApi.getNginxLog(id as string, filename as string, lines),
    enabled: Boolean(id && filename && !filename.endsWith(".gz")),
    staleTime: 0,
  })
}
