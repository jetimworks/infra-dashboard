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
 * Local (containerised) services. Deliberately does NOT accept REMOTE_RDS:
 * a remote database is dialled directly over TCP and has no parent VPS, so
 * there is no create-<type> endpoint to send it to. Typing the parameter as
 * LocalServiceType makes that a build error rather than a runtime fall-through
 * into the storage branch below.
 */
export type LocalServiceType = Exclude<InstanceType, "VPS" | "REMOTE_RDS">

export function useCreateLocalService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      parentId,
      body,
    }: {
      type: LocalServiceType
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

/**
 * Remotely-hosted services. REMOTE_RDS goes through the same POST /instances
 * as the other remote types — the endpoint is the same, only the `type` in
 * the body differs — but it gets its own arm so the storage branch can never
 * swallow it. That fall-through was silent: it created a STORAGE row and
 * toasted "Service added".
 */
export type RemoteServiceType = Exclude<InstanceType, "VPS">

export function useCreateRemoteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      body,
    }: {
      type: RemoteServiceType
      body: CreateRemoteServiceInput
    }) => {
      // `type` is part of the POST /instances body — the endpoint derives the
      // row's type from it and rejects the request outright without one
      // ("type failed the required check"). It is injected HERE rather than
      // asked of the caller because it is the same value this hook dispatches
      // on, and all four helpers below are the identical apiPost("/instances",
      // body). Leaving the two to be set independently is how the field went
      // missing in the first place: the caller set the dispatch variable, the
      // body had no type, every request 400'd, and nothing in the UI pointed
      // at the gap because the type was visibly selected the whole time.
      const payload = { ...body, type }
      if (type === "REDIS") return instancesApi.createRemoteRedis(payload)
      if (type === "RDS") return instancesApi.createRemoteRds(payload)
      if (type === "REMOTE_RDS") return instancesApi.createRemoteRemoteRds(payload)
      return instancesApi.createRemoteStorage(payload)
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

/**
 * Probes a REMOTE_RDS database.
 *
 * HTTP 200 IS NOT the outcome here — `connected` is. The page has to branch on
 * the body, so this hook deliberately does nothing with the result: no toast on
 * success and none on error, because a toast saying "Connection failed" is
 * both redundant with and worse than the verdict panel the page renders.
 *
 * onSuccess is invalidation-only, and it runs on EVERY resolved 200 including
 * `connected: false` — the backend writes an audit row either way, so the
 * activity feed needs refreshing for both outcomes. Nothing unconditional
 * belongs here.
 */
export function useTestDbConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, database }: { id: string; database?: string }) =>
      instancesApi.testDbConnection(id, database),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceActions(vars.id) })
    },
  })
}

/**
 * Browses the PostgreSQL catalog of a REMOTE_RDS instance.
 *
 * retry: false is load-bearing, not a default. The global client retries any
 * non-4xx twice, and this endpoint's failure modes are 502 and 504 — so
 * without it a single click on an unreachable host fires three upstream
 * catalog queries and shows three errors.
 */
export function useInstanceDbSchemas(
  id: string | undefined,
  database: string | undefined
) {
  return useQuery({
    queryKey: id
      ? qk.instanceDbSchemas(id, database)
      : ["instances", id, "db-schemas", "noop"],
    queryFn: () => instancesApi.listDbSchemas(id as string, database),
    enabled: Boolean(id),
    retry: false,
    staleTime: 30_000,
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
