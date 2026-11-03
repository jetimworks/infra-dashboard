import { apiGet, apiPost } from "./client"
import type {
  AiChatResponse,
  AiProposal,
  ReleaseAcceptedResponse,
  ServiceControlResponse,
  SwapCreateResponse,
} from "./types"

/**
 * The outcome of running a confirmed proposal.
 *
 * The backend answers with a different body per operation: a release returns
 * the release acceptance shape, a service control returns the unit and the
 * verb, and a swap creation returns the path and the size. The client's only
 * reliable discriminator is the body itself, so the response is narrowed here
 * into a union the page can switch on.
 */
export type AiExecuteResult =
  | { kind: "release"; response: ReleaseAcceptedResponse }
  | { kind: "service_control"; response: ServiceControlResponse }
  | { kind: "swap_create"; response: SwapCreateResponse }

/**
 * Narrow a raw execute response to the operation that produced it.
 *
 * The order matters: a service control is the only body that carries a
 * `unit`, and a swap creation is the only one that carries a `size_mb`.
 * Anything else is a release acceptance.
 */
function discriminate(raw: Record<string, unknown>): AiExecuteResult {
  if (typeof raw.unit === "string" && typeof raw.action === "string") {
    return {
      kind: "service_control",
      response: raw as unknown as ServiceControlResponse,
    }
  }
  if (typeof raw.size_mb === "number" || typeof raw.path === "string") {
    return {
      kind: "swap_create",
      response: raw as unknown as SwapCreateResponse,
    }
  }
  return {
    kind: "release",
    response: raw as unknown as ReleaseAcceptedResponse,
  }
}

/**
 * The ops console.
 *
 * The console proposes; a person confirms. Nothing here changes anything by
 * itself — `executeProposal` runs an operation the operator already approved
 * on a card that says so.
 */
export const aiopsApi = {
  /** Asks the console a question about an instance. */
  chat: async (
    instanceId: string,
    message: string
  ): Promise<AiChatResponse> => {
    const res = await apiPost<{ data: AiChatResponse }>("/ai/chat", {
      message,
      instance_id: instanceId,
    })
    return res.data
  },

  /** One pending proposal, re-read from the store. */
  getProposal: async (id: string): Promise<AiProposal> => {
    const res = await apiGet<{ data: AiProposal }>(`/ai/actions/${id}`)
    return res.data
  },

  /**
   * Runs a proposal the operator confirmed.
   *
   * The proposal is consumed atomically, so a second attempt is a 404 — and
   * a 403 burns it too, because the consume happens before the ownership
   * check. The UI treats that 404 as "already used" and drops the card; it
   * never retries.
   */
  executeProposal: async (id: string): Promise<AiExecuteResult> => {
    const res = await apiPost<{ data: Record<string, unknown> }>(
      `/ai/actions/${id}/execute`
    )
    return discriminate(res.data)
  },
}
