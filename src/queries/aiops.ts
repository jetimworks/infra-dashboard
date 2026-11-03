import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { aiopsApi, type AiExecuteResult } from "../api/aiops"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"

/**
 * Asks the ops console a question.
 *
 * The console proposes; a person confirms. Nothing here changes anything by
 * itself, so the hook does not invalidate anything on success — the page
 * renders the reply and the proposal cards, and the operator decides.
 *
 * A 503 here means the console is not CONFIGURED, not that it is broken.
 * The message survives `normalizeError` because the backend answers
 * `{"error":"AI console is not configured"}` and the error reader takes the
 * server's own text before it falls back to a generic 5xx message. The page
 * renders that as an empty state rather than an error banner.
 */
export function useAiChat() {
  return useMutation({
    mutationFn: ({
      instanceId,
      message,
    }: {
      instanceId: string
      message: string
    }) => aiopsApi.chat(instanceId, message),
  })
}

/**
 * Re-reads a pending proposal from the store.
 *
 * Used to refresh a card whose countdown has run down, and to confirm a
 * proposal still exists before offering to run it.
 *
 * A 404 is the definitive answer here — the proposal is gone, whether it
 * expired or was consumed elsewhere — so the query gives up on the first
 * 4xx instead of retrying a request whose answer will not change. The global
 * default reads the status off an already-normalised error, and this one
 * throws a raw axios error, so the status is read the same way the card
 * reads it.
 */
export function useAiProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: proposalId ? ["ai", "proposals", proposalId] : ["ai", "proposals", "noop"],
    queryFn: () => aiopsApi.getProposal(proposalId as string),
    enabled: Boolean(proposalId),
    staleTime: 30_000,
    retry: (failureCount, error) => {
      const status = normalizeError(error).status
      if (status >= 400 && status < 500) return false
      return failureCount < 2
    },
  })
}

/**
 * Runs a proposal the operator confirmed.
 *
 * The proposal is consumed atomically, so a second attempt is a 404 — and a
 * 403 burns it too, because the consume happens before the ownership check.
 * A 404 therefore means "already used", and the page drops the card rather
 * than retrying: retrying would either fail again or, worse, run a second
 * operation the operator never approved.
 *
 * The response body differs per operation, so the invalidation follows the
 * discriminated result: a service control refreshes the unit list, a swap
 * creation refreshes the swap and disk panels, and a release refreshes the
 * release history and opens the pipeline poll.
 *
 * The instance id travels with the call because the execute endpoint takes
 * only the proposal id, but the invalidation has to name the instance whose
 * panels need refreshing.
 */
export function useExecuteAiProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      proposalId,
    }: {
      proposalId: string
      instanceId: string
    }) => aiopsApi.executeProposal(proposalId),
    onSuccess: (result: AiExecuteResult, vars) => {
      const { instanceId } = vars

      if (result.kind === "service_control") {
        qc.invalidateQueries({ queryKey: qk.instanceServices(instanceId) })
      }
      if (result.kind === "swap_create") {
        qc.invalidateQueries({ queryKey: qk.instanceSwapRoot(instanceId) })
        qc.invalidateQueries({ queryKey: qk.instanceDiskRoot(instanceId) })
      }
      if (result.kind === "release") {
        qc.invalidateQueries({
          queryKey: qk.instanceReleasesRoot(instanceId),
        })
      }
      qc.invalidateQueries({ queryKey: qk.instanceActionsRoot(instanceId) })
    },
  })
}
