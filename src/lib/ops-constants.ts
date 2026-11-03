/**
 * Vocabulary shared by the ops surfaces — the release pipeline, the system
 * toolkit, the AI console and the gamification engine.
 *
 * These constants mirror the backend's own lists. Where the backend holds a
 * closed set, the frontend holds the same set, because a client that guesses
 * a unit name produces a 400 the operator cannot act on.
 */

/**
 * The stages of the release pipeline, in the order they run.
 *
 * Mirrors release.StageFetch / StageCheckout / StageDeploy /
 * StageRestoreBranch in the backend's services/release package. The order is
 * fixed by the backend and the stepper renders it in this order.
 */
export const RELEASE_STAGE_ORDER = [
  "fetch",
  "checkout",
  "deploy",
  "restore_branch",
] as const

export type ReleaseStageName = (typeof RELEASE_STAGE_ORDER)[number]

/** Operator-facing names for the pipeline stages. */
export const RELEASE_STAGE_LABELS: Record<string, string> = {
  fetch: "Fetch",
  checkout: "Check out",
  deploy: "Deploy",
  restore_branch: "Restore branch",
}

/**
 * The systemd units the service-control endpoint may act on.
 *
 * Mirrors domain.WritableSystemServices exactly — these are BASE names,
 * matched exactly. "nginx.service" and "nginx@blue" are both refused by the
 * backend, so the client must strip the suffix before building the URL and
 * must never offer a verb for anything outside this list.
 */
export const WRITABLE_SERVICE_UNITS = [
  "nginx",
  "postgres",
  "redis",
  "docker",
  "sshd",
  "fail2ban",
  "unattended-upgrades",
] as const

export type WritableServiceUnit = (typeof WRITABLE_SERVICE_UNITS)[number]

/**
 * The units that affect the whole host rather than one workload. On a VPS
 * that parents RDS, Redis or Storage children, stopping one of these takes
 * every sibling down with it — so the service list marks them and the
 * control endpoint returns a blast-radius warning.
 */
export const HOST_WIDE_SERVICE_UNITS = [
  "nginx",
  "postgres",
  "redis",
  "docker",
] as const

/** The verbs the service-control endpoint accepts. */
export const SERVICE_CONTROL_ACTIONS = [
  "start",
  "stop",
  "restart",
  "reload",
] as const

export type ServiceControlAction = (typeof SERVICE_CONTROL_ACTIONS)[number]

/** The verbs the AI console's service_control proposal may carry. */
export const AI_PROPOSAL_LABELS: Record<string, string> = {
  deploy_release: "Deploy a release",
  rollback_release: "Roll back a release",
  service_control: "Control a service",
  swap_create: "Create swap space",
}

/** How long the ops assistant keeps a proposal before it expires. */
export const AI_PROPOSAL_TTL_MS = 15 * 60 * 1000

/**
 * The swap size the backend accepts, in megabytes.
 *
 * Mirrors the validator's `min=256,max=16384` on the create-swap body. The
 * client checks the same range so an obvious mistake never reaches the wire,
 * but the server's own error still goes through normalizeError.
 */
export const MIN_SWAP_SIZE_MB = 256
export const MAX_SWAP_SIZE_MB = 16384

/** The default swap path — the same one the backend uses. */
export const DEFAULT_SWAP_PATH = "/swapfile"

/** The default path the large-file finder scans. */
export const DEFAULT_BIG_FILES_PATH = "/var"

/** The default path the disk report scans. */
export const DEFAULT_DISK_PATH = "/"

/**
 * The disk usage at which a host starts to be a problem.
 *
 * These are the same numbers the quests use, so a quest and the disk panel
 * can never disagree about whether the same filesystem is in trouble.
 */
export const DISK_WARNING_PERCENT = 75
export const DISK_CRITICAL_PERCENT = 90

/** The memory usage at which processes start getting killed outright. */
export const MEMORY_WARNING_PERCENT = 75
export const MEMORY_CRITICAL_PERCENT = 90

/**
 * The commit SHA shape the backend accepts: 7 to 40 hexadecimal characters.
 *
 * Mirrors domain.IsValidCommitSHA. A SHA is not always 40 characters — a
 * short SHA is accepted and the backend resolves it — so the input is
 * validated on length and hex-ness, not on a fixed length.
 */
export const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{7,40}$/

export function isValidCommitSha(value: string): boolean {
  return COMMIT_SHA_PATTERN.test(value.trim())
}
