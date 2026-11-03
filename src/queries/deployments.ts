import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deploymentsApi } from "../api/deployments"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type { CreateDeploymentInput } from "../api/types"

/**
 * Every deployment the caller owns.
 *
 * `pollingFor` asks the query to keep refreshing while one particular
 * deployment is still in the list. Undeploying is asynchronous — the endpoint
 * answers 202 and the server only hides the row once the background job has
 * marked it DELETED — so the page polls for that row rather than pretending
 * it is already gone. The poll stops on its own the moment the row is absent,
 * so a removal that fails leaves the row visible instead of silently losing it.
 */
export function useDeployments(options?: { pollingFor?: string | null }) {
  return useQuery({
    queryKey: qk.deployments(),
    queryFn: () => deploymentsApi.list(),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const id = options?.pollingFor
      if (!id) return false
      const rows = query.state.data ?? []
      return rows.some((row) => row.id === id) ? 2000 : false
    },
  })
}

/**
 * One deployment in full.
 *
 * The endpoint answers the bare object — no envelope — and the API module
 * unwraps it. The query is disabled until an id is known, so the page can
 * mount the drawer without a request.
 */
export function useDeployment(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.deployment(id) : ["deployments", "noop"],
    queryFn: () => deploymentsApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

/**
 * Starts a deployment.
 *
 * The work runs in the background — the response is an acceptance, not a
 * result — so the toast says "started" rather than "created".
 */
export function useCreateDeployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDeploymentInput) => deploymentsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deployments() })
      toast.success("Deployment started")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

/** Undeploys the application. */
export function useDeleteDeployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deploymentsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.deployments() })
      qc.invalidateQueries({ queryKey: qk.deployment(id) })
      toast.success("Deployment removed")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

/** Re-runs a deployment with the settings it was created with. */
export function useRedeployDeployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deploymentsApi.redeploy(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.deployments() })
      qc.invalidateQueries({ queryKey: qk.deployment(id) })
      toast.success("Deployment restarted")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
