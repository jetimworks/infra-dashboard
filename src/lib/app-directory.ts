/**
 * The application directory — the working directory the release pipeline
 * deploys from, the file browser opens at, and the git endpoints act on.
 *
 * Mirrors the backend's domain.IsValidDeployPath exactly — see ../infra-backend
 * `domain/release.go` (`deployPathRe`, `IsValidDeployPath`).
 *
 * The backend is the authority, and it is strict: a path the browser accepts
 * but the backend rejects comes back as a 400 whose message is shown verbatim.
 * Matching the rules here means the operator is told before the round trip.
 */

/** Absolute, no empty segment, no trailing slash, only a safe charset. */
const DEPLOY_PATH_PATTERN = /^\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/

/**
 * Client-side wording for the same rule. The backend returns a near-identical
 * message on a 400; matching it means a rejected value reads the same whether
 * it was caught here or over the wire.
 */
export const APP_DIRECTORY_ERROR =
  "Must be an absolute path with no spaces, shell metacharacters or '..' components (max 255 characters)"

export function isValidDeployPath(value: string): boolean {
  if (!value || value.length > 255) return false
  if (!DEPLOY_PATH_PATTERN.test(value)) return false
  // ".." matches the charset, so every segment is checked separately.
  for (const segment of value.split("/").slice(1)) {
    if (segment === "." || segment === "..") return false
  }
  return true
}

/**
 * The form's rule. The messages are ordered so the most common mistake gets
 * the clearest one, and the charset check runs last so a path with a space
 * does not report a charset problem.
 */
export function validateAppDirectory(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return "Enter a path."
  if (!trimmed.startsWith("/"))
    return "The path must be absolute — it has to start with /."
  if (trimmed.length > 255) return "The path must be at most 255 characters."
  if (trimmed.split("/").includes(".."))
    return "The path must not contain a '..' component."
  if (/\s/.test(trimmed)) return "The path must not contain spaces."
  if (!DEPLOY_PATH_PATTERN.test(trimmed))
    return "The path may contain only letters, digits, '.', '_', '-' and '/'."
  return null
}
