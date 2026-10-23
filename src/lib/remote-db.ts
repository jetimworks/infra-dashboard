import type { DbErrorCode, InstanceConfig } from "../api/types"

/**
 * Everything the frontend needs to know about a REMOTE_RDS row, in one place.
 *
 * Mirrors infra-backend/domain/instance.go and internal/services/rdb/errors.go.
 * The rules are duplicated here deliberately rather than discovered at runtime:
 * every one of them produces a 400 at write time, and catching them inline is
 * the difference between a helpful field error and a round trip.
 */

/** libpq sslmode values the backend accepts, in domain/instance.go:93. */
export const DB_SSL_MODES = [
  "disable",
  "allow",
  "prefer",
  "require",
  "verify-ca",
  "verify-full",
] as const

export type DbSSLMode = (typeof DB_SSL_MODES)[number]

/** domain/instance.go:105 — what a row with no db_ssl_mode connects with. */
export const DEFAULT_DB_SSL_MODE: DbSSLMode = "prefer"

/** domain/instance.go:109 — PostgreSQL's own default. */
export const DEFAULT_DB_PORT = 5432

/**
 * domain/instance.go:82 — DNS hostname or IPv4 literal. A leading or trailing
 * dot is rejected, which is what keeps a unix-socket path like
 * /var/run/postgresql out of the host field.
 */
const DB_HOST_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9._-]{0,251}[A-Za-z0-9])?$/

/** domain/instance.go:87 — database or role name, 1-63 characters. */
const DB_IDENT_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$/

export const DB_HOST_ERROR =
  "Enter an IPv4 address, IPv6 address or DNS hostname"

export const DB_IDENT_ERROR =
  "Must start with a letter, digit or underscore, and may otherwise contain only letters, digits, '_', '.' and '-' (max 63 characters)"

export const DB_PORT_ERROR = "Port must be between 1 and 65535"

export function isValidDbHost(value: string): boolean {
  const host = value.trim()
  if (host === "") return false
  // IPv6 literals fall outside DB_HOST_PATTERN's charset (their colons do),
  // so they are checked as addresses — the same two-step net.ParseIP-then-
  // regex the backend uses at domain/instance.go:199.
  if (isIpv6(host)) return true
  return DB_HOST_PATTERN.test(host)
}

export function isValidDbIdent(value: string): boolean {
  return DB_IDENT_PATTERN.test(value.trim())
}

export function isValidDbPort(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === "") return true // blank means "the default"
  const port = Number(trimmed)
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * A colon is not enough to call something IPv6 — "host:5432" has one too, and
 * accepting it as an address would smuggle a port through a field the backend
 * validates strictly. Require at least two colons and hex-only groups.
 */
function isIpv6(value: string): boolean {
  if (!value.includes(":") || value.includes(":::")) return false
  return value
    .split(":")
    .every((group) => group === "" || /^[0-9A-Fa-f]{1,4}$/.test(group))
}

/**
 * The canonical config keys a REMOTE_RDS row carries. The backend rewrites
 * config into exactly this shape on write and deletes every password key
 * before marshalling (internal/rest/instance_remote_rds.go:154-164), so these
 * four are the only ones worth reading back.
 */
export interface RemoteDbConfig {
  database: string
  user: string
  port: number | null
  sslMode: DbSSLMode
}

/**
 * Reads the canonical keys off an instance config.
 *
 * InstanceConfig is Record<string, unknown>, so every value needs narrowing.
 * Returns "" / null rather than throwing for anything missing — an instance
 * mid-creation legitimately has none of these, and the detail page renders
 * from this on every load.
 */
export function readRemoteDbConfig(config: InstanceConfig | null): RemoteDbConfig {
  return {
    database: readString(config?.db_name),
    user: readString(config?.db_user),
    port: readNumber(config?.db_port),
    sslMode: readSSLMode(config?.db_ssl_mode),
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readSSLMode(value: unknown): DbSSLMode {
  const mode = readString(value)
  return (DB_SSL_MODES as readonly string[]).includes(mode)
    ? (mode as DbSSLMode)
    : DEFAULT_DB_SSL_MODE
}

/**
 * Operator-facing remediation, keyed on the backend's error_code rather than
 * the prose of the message.
 *
 * Strictly better than substring-matching the message: the codes are a closed
 * set on the backend (internal/services/rdb/errors.go), so this cannot drift
 * the way a `message.includes("auth")` check would when the wording changes.
 * The three buckets are the three things an operator can actually do — fix the
 * row, rotate the credential, or look at the network.
 */
const DB_ERROR_CLASS = {
  fixInstance: "fix-instance",
  rotateCredential: "rotate-credential",
  networkOrTls: "network-or-tls",
} as const

type DbErrorClass = (typeof DB_ERROR_CLASS)[keyof typeof DB_ERROR_CLASS]

const DB_ERROR_CLASSES: Record<DbErrorCode, DbErrorClass> = {
  DB_CONFIG_INVALID: DB_ERROR_CLASS.fixInstance,
  DB_DATABASE_NOT_FOUND: DB_ERROR_CLASS.fixInstance,
  DB_AUTH_FAILED: DB_ERROR_CLASS.rotateCredential,
  DB_UNREACHABLE: DB_ERROR_CLASS.networkOrTls,
  DB_TIMEOUT: DB_ERROR_CLASS.networkOrTls,
  DB_TLS_FAILED: DB_ERROR_CLASS.networkOrTls,
  DB_SERVER_ERROR: DB_ERROR_CLASS.networkOrTls,
  DB_QUERY_FAILED: DB_ERROR_CLASS.networkOrTls,
}

export interface DbErrorGuidance {
  /** The bucket, so the UI can pick a tone and a call to action. */
  class: DbErrorClass
  /** What the operator should do about it. */
  text: string
}

export function dbErrorGuidance(code: DbErrorCode): DbErrorGuidance {
  const errorClass = DB_ERROR_CLASSES[code] ?? DB_ERROR_CLASS.networkOrTls

  switch (errorClass) {
    case DB_ERROR_CLASS.fixInstance:
      return {
        class: errorClass,
        text: "The connection settings on this instance need correcting. Check the host, port and database name.",
      }
    case DB_ERROR_CLASS.rotateCredential:
      return {
        class: errorClass,
        text: "The server rejected this database user's password. Update the password on this instance, then try again.",
      }
    case DB_ERROR_CLASS.networkOrTls:
      return {
        class: errorClass,
        text: "We couldn't reach the database. Check that the host is reachable from our network and that the TLS mode matches what the server expects.",
      }
  }
}

/**
 * Pulls the DB_* code out of a schemas-endpoint message.
 *
 * ListDBSchemas answers with real HTTP errors and formats them as
 * "%s: %s" (CodeOf, MessageOf) — so unlike the test endpoint, which carries
 * error_code as a field, the code here has to be recovered from the string.
 * Returns null when the body isn't in that shape, and the caller falls back to
 * the raw message rather than guessing.
 */
export function parseDbErrorCode(message: string): DbErrorCode | null {
  const match = /^DB_[A-Z_]+/.exec(message)
  if (!match) return null
  const code = match[0]
  return code in DB_ERROR_CLASSES ? (code as DbErrorCode) : null
}