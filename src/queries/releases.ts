import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { releasesApi } from "../api/releases"
import { qk } from "../lib/query-keys"

/**
 * The release pipeline's own polling rhythm.
 *
 * A release runs in the background and reports its progress through the
 * release endpoint, so the client has to poll it. Two rates:
 *
 *   - 2 s while the release is young. The operator is watching, and the
 *     pipeline's slow stages are the ones worth watching.
 *   - 10 s once the release has been running for five minutes. A long
 *     release is usually a slow build, not a live incident, and a 2 s poll
 *     against a busy host is not free.
 *
 * The poll stops the moment the release reaches a terminal state. `false`
 * means "do not poll again", and that is also what a query with no data yet
 * returns — the first fetch is driven by the query itself, not by the
 * interval.
 */
const RELEASE_POLL_FAST_MS = 2_000
const RELEASE_POLL_SLOW_MS = 10_000
const RELEASE_POLL_SLOW_AFTER_MS = 5 * 60_000

/** The release history, newest first. */
export function useReleaseHistory(
  instanceId: string | undefined,
  filters?: { type?: string; status?: string; limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instanceReleases(instanceId, filters)
      : ["instances", instanceId, "releases", "list", "noop"],
    queryFn: () => releasesApi.list(instanceId as string, filters),
    enabled: Boolean(instanceId),
    staleTime: 15_000,
  })
}

/**
 * One release in full, polled while it runs.
 *
 * This is the ONLY place the pipeline's progress is visible — the generic
 * action queue does not carry stage status — so the poll lives here rather
 * than in `AsyncActionTracker`.
 *
 * `refetchIntervalInBackground: false` keeps the poll off a hidden tab. An
 * operator who switches tabs to check something else should come back to a
 * fresh read, not to a request that fired while they were away.
 */
export function useReleaseDetail(
  instanceId: string | undefined,
  actionId: string | undefined
) {
  return useQuery({
    queryKey:
      instanceId && actionId
        ? qk.instanceRelease(instanceId, actionId)
        : ["instances", instanceId, "releases", "detail", "noop"],
    queryFn: () => releasesApi.get(instanceId as string, actionId as string),
    enabled: Boolean(instanceId && actionId),
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      if (data.status === "SUCCESS" || data.status === "FAILED") return false
      const started = Date.parse(data.started_at)
      const elapsed = Number.isNaN(started) ? 0 : Date.now() - started
      return elapsed > RELEASE_POLL_SLOW_AFTER_MS
        ? RELEASE_POLL_SLOW_MS
        : RELEASE_POLL_FAST_MS
    },
    refetchIntervalInBackground: false,
  })
}

/**
 * The deploy script's own output, as plain text.
 *
 * Fetched on demand — the log is only worth a round trip when someone asks
 * for it, and the endpoint returns the whole transcript.
 */
export function useReleaseLog(
  instanceId: string | undefined,
  actionId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey:
      instanceId && actionId
        ? qk.instanceReleaseLog(instanceId, actionId)
        : ["instances", instanceId, "releases", "log", "noop"],
    queryFn: () => releasesApi.log(instanceId as string, actionId as string),
    enabled: Boolean(instanceId && actionId && enabled),
    staleTime: 5 * 60_000,
  })
}

/**
 * "What would change if I deployed this SHA?"
 *
 * Enabled only once there is a SHA to compare — the endpoint refuses a
 * missing one, and firing it on an empty input would just be a 400 in a
 * console nobody reads.
 */
export function useReleaseDiff(
  instanceId: string | undefined,
  to: string | undefined,
  from?: string
) {
  return useQuery({
    queryKey:
      instanceId && to
        ? qk.instanceReleaseDiff(instanceId, to, from)
        : ["instances", instanceId, "releases", "diff", "noop"],
    queryFn: () =>
      releasesApi.diff(instanceId as string, to as string, from),
    enabled: Boolean(instanceId && to && to.trim() !== ""),
    staleTime: 60_000,
  })
}

/**
 * The pre-deploy preview: what deploying this branch would bring.
 *
 * `staleTime: 0` and `refetchOnMount` so every panel open re-fetches — the
 * remote moves, and a cached "up to date" is exactly the wrong answer to show
 * before a deploy. No retry: a failure is information the operator should see
 * immediately, not something to hide behind a spinner.
 */
export function usePreDeploy(
  instanceId: string | undefined,
  branch: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instancePreDeploy(instanceId, branch)
      : ["instances", instanceId, "releases", "pre-deploy", "noop"],
    queryFn: () => releasesApi.preDeploy(instanceId as string, branch),
    enabled: Boolean(instanceId) && enabled,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  })
}

/**
 * Starts a release.
 *
 * No toast on success or failure: the page renders the acceptance and any
 * refusal inline, next to the form that produced it. The action id comes
 * back in the response and the page uses it to open the detail view, which
 * starts the pipeline poll.
 */
export function useCreateRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ instanceId, sha }: { instanceId: string; sha: string }) =>
      releasesApi.create(instanceId, sha),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceReleasesRoot(vars.instanceId) })
      qc.invalidateQueries({
        queryKey: qk.instanceActionsRoot(vars.instanceId),
      })
    },
  })
}

/**
 * Rolls a previous release back.
 *
 * The rollback only works against a release that SUCCEEDED. The backend
 * answers 409 with the reason — "only a successful release can be rolled
 * back to" — and that sentence is the diagnosis, so the page shows it
 * verbatim rather than the hook paraphrasing it.
 */
export function useRollbackRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      instanceId,
      actionId,
    }: {
      instanceId: string
      actionId: string
    }) => releasesApi.rollback(instanceId, actionId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceReleasesRoot(vars.instanceId) })
      qc.invalidateQueries({
        queryKey: qk.instanceActionsRoot(vars.instanceId),
      })
    },
  })
}
