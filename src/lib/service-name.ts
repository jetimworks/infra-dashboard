/**
 * Per-VPS application service name (the systemd unit app-control acts on).
 *
 * The backend stores this as a nullable `service_name` column and resolves a
 * NULL or empty value to `goweb` at call time. These helpers mirror that
 * contract exactly — see ../infra-backend `domain/instance.go`
 * (`SystemServiceGoweb`, `serviceNameRe`, `IsValidServiceName`) and
 * `resolveAppService` in `internal/rest/instance_ops_handler.go`.
 */

/** The unit app-control targets when an instance has no explicit name. */
export const DEFAULT_SERVICE_NAME = "goweb"

/**
 * Must start with a letter or digit, then up to 63 more letters, digits or
 * `.` `_` `@` `-`. The leading-character rule keeps a name from being read as a
 * path, an SSH option or a shell metacharacter when it is interpolated into
 * the remote command.
 */
const SERVICE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@-]{0,63}$/

/**
 * Client-side wording for the same rule. The backend returns a near-identical
 * message on a 400; matching it means a rejected value reads the same whether
 * it was caught here or over the wire.
 */
export const SERVICE_NAME_ERROR =
  "Must start with a letter or digit, and may contain only letters, digits, '.', '_', '@' and '-' (max 64 characters)"

export function isValidServiceName(value: string): boolean {
  return SERVICE_NAME_PATTERN.test(value)
}

/**
 * The unit this instance actually runs. `|| ""` covers all three NULL-ish
 * cases the backend treats as unset: null, undefined and empty string.
 */
export function resolveServiceName(instance: { service_name?: string | null }): string {
  return instance.service_name || DEFAULT_SERVICE_NAME
}