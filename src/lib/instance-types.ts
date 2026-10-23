import type { InstanceType } from "../api/types"

/**
 * The instance-type buckets the UI filters and groups by.
 *
 * This exists because RDS and REMOTE_RDS are different types that belong to
 * the same user-facing category. They are genuinely different things — one is
 * a container reached through a parent VPS, the other a server the backend
 * dials directly — but someone looking for "the databases" does not want to
 * know which kind, and two chips reading "Databases" is worse than one.
 *
 * The rule lives here rather than in each list page because getting it wrong
 * in one place produces a bug the compiler cannot see: `type === "RDS"`
 * filters do not match a REMOTE_RDS row, so an un-updated filter does not
 * error, it silently hides the instances.
 */

export type InstanceBucket = "SERVERS" | "DATABASES" | "CACHES" | "STORAGE"

/** Filter chips, in display order. */
export const INSTANCE_BUCKETS: { value: InstanceBucket; label: string }[] = [
  { value: "SERVERS", label: "Servers" },
  { value: "DATABASES", label: "Databases" },
  { value: "CACHES", label: "Caches" },
  { value: "STORAGE", label: "Storage" },
]

/**
 * Every instance type, placed.
 *
 * Exhaustive by construction, which is the point: adding a member to the
 * InstanceType union without placing it here is a build error rather than a
 * row that renders nowhere. This is the same forcing function an exhaustive
 * Record<InstanceType, …> gives you, expressed as the rule the UI actually
 * needs.
 */
const bucketByType: Record<InstanceType, InstanceBucket> = {
  VPS: "SERVERS",
  RDS: "DATABASES",
  REMOTE_RDS: "DATABASES",
  REDIS: "CACHES",
  STORAGE: "STORAGE",
}

/** The instance types a bucket shows. */
export const bucketTypes: Record<InstanceBucket, InstanceType[]> = {
  SERVERS: ["VPS"],
  DATABASES: ["RDS", "REMOTE_RDS"],
  CACHES: ["REDIS"],
  STORAGE: ["STORAGE"],
}

/**
 * Every instance type, derived from the placement map above so it can never
 * drift. Used to validate ?type= deep links.
 */
export const INSTANCE_TYPES = Object.keys(bucketByType) as InstanceType[]

export function isInstanceType(value: string): value is InstanceType {
  return (INSTANCE_TYPES as string[]).includes(value)
}

export function bucketForType(type: InstanceType): InstanceBucket {
  return bucketByType[type]
}

export function instanceMatchesBucket(
  type: InstanceType,
  bucket: InstanceBucket
): boolean {
  return bucketByType[type] === bucket
}

/**
 * True only for a directly-dialed remote database — NOT for a local RDS
 * container. Gate the connection-test and schema-browser affordances on this
 * rather than on the presence of a database name in config: a local RDS row
 * carries one too, and both endpoints answer 400 on anything else.
 */
export function isRemoteRds(type: InstanceType): boolean {
  return type === "REMOTE_RDS"
}