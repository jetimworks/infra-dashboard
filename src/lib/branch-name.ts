/**
 * The git branch an instance tracks.
 *
 * Mirrors the backend's domain.IsValidGitBranch exactly — see ../infra-backend
 * `domain/release.go` (`gitBranchRe`, `IsValidGitBranch`).
 *
 * The backend does NOT validate the branch when it is written: an invalid
 * value is stored, and it is then silently ignored when it is read — the
 * release deploy branch is used instead. Validating here is what stops an
 * operator believing they moved the instance onto a branch it never went to.
 */

/**
 * Must start with a letter or digit, then up to 99 more letters, digits or
 * `.` `_` `/` `-`. The leading-character rule keeps a branch from being read as
 * a git flag such as `--help`.
 */
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/

/**
 * Client-side wording for the same rule. The backend does not check the
 * branch on write, so this is the only message the operator gets.
 */
export const BRANCH_NAME_ERROR =
  "Must start with a letter or digit, and may contain only letters, digits, '.', '_', '/' and '-' (max 100 characters)"

export function isValidBranchName(value: string): boolean {
  if (!value) return false
  if (!BRANCH_PATTERN.test(value)) return false
  if (value.includes("..") || value.includes("@{")) return false
  if (value.endsWith("/") || value.endsWith(".lock")) return false
  return true
}

/**
 * The rule the FORM applies, which is deliberately looser than the branch's:
 * an empty branch is allowed.
 *
 * `{"github_branch": ""}` stores an empty string, and an empty stored branch
 * falls back to the release deploy branch — so the empty string is how an
 * operator goes back to the default. It has to survive validation to reach
 * the backend. (null would NOT work: null is an absent field, and a body of
 * nothing but nulls is a 400 "no fields to update".)
 */
export function validateBranch(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    // A field holding only whitespace is NOT the reset — only an empty field
    // is. Otherwise a stray space would silently clear the branch.
    return value
      ? "Enter a branch name, or clear the field entirely to use the release deploy branch."
      : null
  }
  return isValidBranchName(trimmed) ? null : BRANCH_NAME_ERROR
}

/**
 * The branch an instance falls back to when it does not pin one: the release
 * deploy branch from the instance config, or the platform default.
 *
 * Mirrors domain.DefaultDeployBranch ("dev") and the config key
 * domain.ConfigKeyDeployBranch ("deploy_branch").
 */
export const DEFAULT_DEPLOY_BRANCH = "dev"

export function readDeployBranch(
  config: Record<string, unknown> | undefined
): string {
  const value = config?.deploy_branch
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_DEPLOY_BRANCH
}
