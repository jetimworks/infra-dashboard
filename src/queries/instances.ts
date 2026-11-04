import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { instancesApi } from "../api/instances"
import { filesApi } from "../api/files"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type {
  AppControlInput,
  CreateInstanceInput,
  GitStatus,
  CreateLocalServiceInput,
  CreateRemoteServiceInput,
  InstanceType,
  SshKeyUploadInput,
  SystemActionInput,
  UpdateInstanceInput,
} from "../api/types"

/**
 * The caller's instances.
 *
 * `parentId` is accepted so the query key can distinguish the call, but it is
 * NOT a server-side filter: `GET /instances` reads only `project_id`, `view`
 * and `type` from the query string, so a `parent_id` parameter is silently
 * ignored and the whole list comes back. Anything that needs "the children of
 * this host" has to filter the response on the `parent_id` column the
 * `Instance` type already exposes.
 */
export function useInstances(
  filters?: {
    projectId?: string
    type?: InstanceType
    parentId?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: qk.instances(filters),
    queryFn: () => instancesApi.list(filters),
    enabled: options?.enabled ?? true,
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

// ──────────────────────────────────────────────────────────────────────────
// VPS files, app directory & git
// ──────────────────────────────────────────────────────────────────────────

/**
 * The one application directory on the instance: what the release pipeline
 * deploys from, what the file browser opens at, and what the git endpoints
 * act on.
 *
 * It is read from the API, never from the frontend. `source` says whether it
 * came from the instance's config or from the platform default, and
 * `warnings` is non-empty when the configured path was rejected.
 */
export function useAppDirectory(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? qk.instanceAppDirectory(id)
      : ["instances", id, "app-directory", "noop"],
    queryFn: () => filesApi.appDirectory(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

/**
 * Changes the application directory.
 *
 * This MERGES into the stored config. `PUT /instances/{id}` must never be used
 * for this — it replaces the whole config blob and wipes the instance's
 * db_name, db_user, db_password and deploy_script_path.
 */
export function useSetAppDirectory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) =>
      filesApi.setAppDirectory(id, path),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceAppDirectory(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceFilesRoot(vars.id) })
      toast.success("App directory updated")
    },
    // No error toast: the backend's rejection message ("the directory /root/app
    // does not exist on the instance") is the diagnosis, and the page renders
    // it verbatim.
  })
}

/**
 * Lists a directory on the host.
 *
 * `path` undefined means "list the app directory" — the browser's default
 * open. The response echoes the NORMALISED path, so the page drives its
 * breadcrumb from the response, not from what it asked for.
 */
export function useDirectoryListing(
  id: string | undefined,
  path: string | undefined
) {
  return useQuery({
    queryKey: id
      ? qk.instanceFiles(id, path ?? "")
      : ["instances", id, "files", "list", "noop"],
    queryFn: () => filesApi.list(id as string, path),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

/**
 * Reads one file.
 *
 * `retry: false` — a 404 on a path is a diagnosis, not a blip worth retrying.
 */
export function useFileContent(
  id: string | undefined,
  path: string | undefined
) {
  return useQuery({
    queryKey:
      id && path
        ? qk.instanceFileContent(id, path)
        : ["instances", id, "files", "content", "noop"],
    queryFn: () => filesApi.content(id as string, path as string),
    enabled: Boolean(id && path),
    retry: false,
    staleTime: 0,
  })
}

/**
 * Writes one file.
 *
 * The write is atomic server-side and preserves mode and owner. A failed
 * write still leaves a FAILED row in the ledger, so the activity feed shows
 * the attempt either way.
 */
export function useWriteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      path,
      content,
    }: {
      id: string
      path: string
      content: string
    }) => filesApi.write(id, path, content),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceFilesRoot(vars.id) })
      qc.invalidateQueries({
        queryKey: qk.instanceFileContent(vars.id, vars.path),
      })
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
      toast.success(`Saved ${vars.path}`)
    },
    // No error toast: the page renders the backend's message verbatim, next
    // to the file. A 500 here can also mean "the file was written but the
    // audit row could not be recorded" — paraphrasing that would send the
    // operator back to fix something that is already fixed.
  })
}

/**
 * The app's .env, through the dedicated endpoint — the frontend never has to
 * build the path itself.
 *
 * A 404 means "there is no .env yet", not a dead end: the page offers to
 * create it.
 */
export function useInstanceEnv(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: id ? qk.instanceEnv(id) : ["instances", id, "files", "env", "noop"],
    queryFn: () => filesApi.env(id as string),
    enabled: Boolean(id) && enabled,
    retry: false,
    staleTime: 0,
  })
}

/** Writes the app's .env. Creates it with mode 600 when it is missing. */
export function useWriteEnv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      filesApi.writeEnv(id, content),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceEnv(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceFilesRoot(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
      toast.success("Saved .env")
    },
    // No error toast — the page renders the backend's message verbatim.
  })
}

/** The working tree's state: branch, HEAD, and what is changed. */
export function useGitStatus(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? qk.instanceGitStatus(id)
      : ["instances", id, "git", "status", "noop"],
    queryFn: () => filesApi.gitStatus(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

/**
 * Pulls the configured branch.
 *
 * The pull is `--ff-only`, so a diverged branch fails with git's own message
 * and nothing is retried.
 */
export function useGitPull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, branch }: { id: string; branch?: string }) =>
      filesApi.gitPull(id, branch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceGitRoot(vars.id) })
      // A pull changes the working tree on disk, so the open file and the
      // listing are both stale after it.
      qc.invalidateQueries({ queryKey: qk.instanceFilesRoot(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
      toast.success("Pulled")
    },
    // No error toast: git's own message — "Not possible to fast-forward,
    // aborting." — is the diagnosis, and the page renders it verbatim.
  })
}

/**
 * Commits and pushes the working tree.
 *
 * The backend stages EVERY untracked, non-ignored file, so the page shows the
 * operator what is about to be committed BEFORE this runs. A push with nothing
 * to push is a 200 with `pushed: false` — the page renders that as
 * information, so there is no error toast here.
 */
export function useGitPush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      branch,
      message,
    }: {
      id: string
      branch?: string
      message: string
    }) => filesApi.gitPush(id, { branch, message }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceGitRoot(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceFilesRoot(vars.id) })
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(vars.id) })
    },
  })
}

/**
 * Moves paths out of the index. Nothing on the host changes, and no ledger
 * row is written, so only the status cache is touched — its `dirty` list is
 * replaced by the one the backend returns.
 */
export function useGitUnstage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paths,
      branch,
    }: {
      id: string
      paths: string[]
      branch?: string
    }) => filesApi.gitUnstage(id, paths, branch),
    onSuccess: (data, vars) => {
      qc.setQueryData<GitStatus>(qk.instanceGitStatus(vars.id), (old) =>
        old ? { ...old, dirty: data.dirty } : old
      )
    },
  })
}

/**
 * Discards uncommitted changes to the given paths. The discarded changes
 * cannot be recovered; the page confirms before it calls this. Untracked and
 * newly added paths come back in `skipped` and are never deleted.
 */
export function useGitRevert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paths,
      branch,
    }: {
      id: string
      paths: string[]
      branch?: string
    }) => filesApi.gitRevert(id, paths, branch),
    onSuccess: (data, vars) => {
      qc.setQueryData<GitStatus>(qk.instanceGitStatus(vars.id), (old) =>
        old ? { ...old, dirty: data.dirty } : old
      )
      // A revert rewrites files on disk, so the open editor and listing are stale.
      qc.invalidateQueries({ queryKey: qk.instanceFilesRoot(vars.id) })
    },
  })
}
