import type { AiProposal } from "../api/types"
import { AI_PROPOSAL_LABELS } from "./ops-constants"

/**
 * The proposal vocabulary.
 *
 * The console names an operation from a closed enum and hands over a bag of
 * parameters for it. Those parameters arrive as untyped JSON — the backend
 * normalises them before storing the proposal, but the wire type is still
 * `map[string]any` — so every reader of them goes through this module.
 *
 * Two places that coerce a number differently is how a swap size ends up
 * rendered as "2048" on one card and "2,048 MB" on another, so the coercion
 * lives here once.
 */

/** One parameter of a proposal, ready to be shown to a person. */
export interface ProposalParam {
  /** What the value is. */
  label: string
  /** The value, already formatted for display. */
  value: string
  /** Render the value in the monospace face — SHAs, paths and unit names. */
  mono?: boolean
}

/**
 * Read a parameter as text.
 *
 * A number that arrives as a JSON number and one that arrives as a string
 * holding a number are the same parameter; the backend normalises the
 * integer case before storing, but a proposal read back from the store is
 * decoded again, so both forms have to be tolerated here.
 */
function readValue(
  params: Record<string, unknown>,
  name: string
): string | null {
  const value = params[name]
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed === "" ? null : trimmed
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

/** The operation's name in the operator's language. */
export function proposalLabel(type: string): string {
  return AI_PROPOSAL_LABELS[type] ?? "Proposed action"
}

/**
 * The proposal's parameters, in the order an operator wants to read them.
 *
 * The parameter set is fixed per operation, so the order is fixed too — a
 * card never reorders itself between renders.
 */
export function proposalParams(proposal: AiProposal): ProposalParam[] {
  const params = proposal.params ?? {}

  switch (proposal.type) {
    case "deploy_release": {
      const sha = readValue(params, "sha")
      return sha ? [{ label: "Commit", value: sha, mono: true }] : []
    }

    case "rollback_release": {
      // A rollback names either a commit or a release to re-deploy, and the
      // console may send both. Both are shown when they are there.
      const sha = readValue(params, "sha")
      const releaseId = readValue(params, "release_id")
      const rows: ProposalParam[] = []
      if (sha) rows.push({ label: "Roll back to", value: sha, mono: true })
      if (releaseId) {
        rows.push({ label: "Release", value: releaseId, mono: true })
      }
      return rows
    }

    case "service_control": {
      const unit = readValue(params, "unit")
      const action = readValue(params, "action")
      const rows: ProposalParam[] = []
      if (unit) rows.push({ label: "Unit", value: unit, mono: true })
      if (action) rows.push({ label: "Action", value: action })
      return rows
    }

    case "swap_create": {
      const size = readValue(params, "size_mb")
      const path = readValue(params, "path")
      const rows: ProposalParam[] = []
      if (size) rows.push({ label: "Size", value: `${size} MB` })
      if (path) rows.push({ label: "Path", value: path, mono: true })
      return rows
    }

    default:
      // An operation this client has never heard of still has to render
      // something honest rather than an empty card.
      return Object.entries(params).map(([name, value]) => ({
        label: name.replace(/_/g, " "),
        value:
          typeof value === "string"
            ? value
            : typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : JSON.stringify(value),
      }))
  }
}

/**
 * One line saying what confirming the proposal will actually do.
 *
 * This is the sentence the operator reads before they press the button, so it
 * names the operation in the same words the platform uses — "restart nginx",
 * not "service_control on nginx".
 */
export function proposalEffect(proposal: AiProposal): string {
  const params = proposal.params ?? {}

  switch (proposal.type) {
    case "deploy_release": {
      const sha = readValue(params, "sha")
      return sha
        ? `Deploy commit ${sha.slice(0, 8)} to this server.`
        : "Deploy a commit to this server."
    }

    case "rollback_release": {
      const sha = readValue(params, "sha")
      const releaseId = readValue(params, "release_id")
      if (sha) return `Re-deploy commit ${sha.slice(0, 8)} on this server.`
      if (releaseId) {
        return `Re-deploy the commit recorded by release ${releaseId.slice(0, 8)}.`
      }
      return "Re-deploy an earlier release on this server."
    }

    case "service_control": {
      const unit = readValue(params, "unit")
      const action = readValue(params, "action")
      if (!unit || !action) return "Run a systemd command on this server."
      return `Run \`${action} ${unit}\` on this server.`
    }

    case "swap_create": {
      const size = readValue(params, "size_mb")
      const path = readValue(params, "path")
      const sizePart = size ? `${size} MB of` : "A new file of"
      return `Create ${sizePart} swap space at ${path ?? "/swapfile"}.`
    }

    default:
      return "Run this operation on the server."
  }
}

/**
 * How long the proposal stays confirmable, in milliseconds, or null when it
 * has already expired.
 *
 * The backend keeps a proposal for fifteen minutes. The countdown on the
 * card is the client-side half of that promise; the server is the half that
 * counts.
 */
export function millisecondsUntil(
  expiresAt: string,
  now: number
): number | null {
  const expiry = Date.parse(expiresAt)
  if (Number.isNaN(expiry)) return null
  const remaining = expiry - now
  return remaining > 0 ? remaining : null
}

/** "14:32" — the remaining minutes and seconds, or null when it is gone. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
