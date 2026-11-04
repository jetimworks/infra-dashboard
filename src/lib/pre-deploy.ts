import type { PreDeployReport } from "../api/types"

/**
 * The verdict the deploy page gates its button on.
 *
 *   - `ready`    — there is something to deploy; nothing blocks it.
 *   - `upToDate` — the branch is already deployed; deploying is a no-op.
 *   - `blocked`  — the working tree is dirty, so a deploy will refuse to run.
 *   - `unknown`  — the check failed or has no answer; the state is not known.
 */
export type PreDeployVerdict = "ready" | "upToDate" | "blocked" | "unknown"

export function preDeployVerdict(
  report: PreDeployReport | undefined,
  error: unknown
): PreDeployVerdict {
  if (error || !report) return "unknown"
  if (report.dirty && report.dirty.length > 0) return "blocked"
  if (report.up_to_date) return "upToDate"
  return "ready"
}
