/**
 * Typed readers over the actions ledger's `metadata` column.
 *
 * The ledger stores one jsonb blob per row, and its shape depends on the
 * row's action type:
 *
 *   RELEASE / ROLLBACK  → the release state (sha, branch, stages, …)
 *   SERVICE_CONTROL     → { unit, action, output, warnings }
 *   SWAP_CREATE         → { path, size_mb, output, warnings }
 *
 * Reading `action.metadata.unit` directly in a component is how a component
 * ends up rendering `undefined` as if it were a value. These readers are the
 * only place the blob is touched: each one checks the key exists and is the
 * right type, and returns null otherwise.
 */

import type { Action } from "../api/types"

/** A metadata blob, narrowed to something readable. */
export type ActionMetadata = Record<string, unknown>

function metadataOf(action: Pick<Action, "metadata">): ActionMetadata {
  return action.metadata ?? {}
}

/**
 * Read a string out of the metadata blob.
 *
 * `trimmed` is on because the backend writes values it has already trimmed
 * for the release state but not for the free-form maps, and a stray space
 * would make an equality check fail silently.
 */
export function metaString(
  action: Pick<Action, "metadata">,
  key: string
): string | null {
  const value = metadataOf(action)[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function metaNumber(
  action: Pick<Action, "metadata">,
  key: string
): number | null {
  const value = metadataOf(action)[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  return null
}

export function metaBoolean(
  action: Pick<Action, "metadata">,
  key: string
): boolean | null {
  const value = metadataOf(action)[key]
  if (typeof value === "boolean") return value
  return null
}

/** Read a list of strings, normalising a nil/absent value to an empty array. */
export function metaStringArray(
  action: Pick<Action, "metadata">,
  key: string
): string[] {
  const value = metadataOf(action)[key]
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

/** The systemd unit a SERVICE_CONTROL row acted on. */
export function metaUnit(action: Pick<Action, "metadata">): string | null {
  return metaString(action, "unit")
}

/** The verb a SERVICE_CONTROL row used. */
export function metaAction(action: Pick<Action, "metadata">): string | null {
  return metaString(action, "action")
}

/** The commit a RELEASE or ROLLBACK row deployed. */
export function metaSha(action: Pick<Action, "metadata">): string | null {
  return metaString(action, "sha")
}

/** The release a ROLLBACK row rolled back to. */
export function metaRollbackOf(
  action: Pick<Action, "metadata">
): string | null {
  return metaString(action, "rollback_of")
}

/** The path a SWAP_CREATE row wrote to. */
export function metaPath(action: Pick<Action, "metadata">): string | null {
  return metaString(action, "path")
}

/** The size a SWAP_CREATE row wrote, in megabytes. */
export function metaSizeMb(action: Pick<Action, "metadata">): number | null {
  return metaNumber(action, "size_mb")
}

/** Where a release came from: "user" or "ai". */
export function metaTrigger(
  action: Pick<Action, "metadata">
): string | null {
  return metaString(action, "trigger")
}

/** The raw command output a write recorded. */
export function metaOutput(
  action: Pick<Action, "metadata">
): string | null {
  return metaString(action, "output")
}
