/**
 * The Ops Score and the level ring.
 *
 * Both are pure functions over cached data. No React, no I/O, no clocks
 * beyond what the caller passes in. That is what makes them trustworthy:
 * the same inputs always produce the same score, and a score can never
 * depend on whether a network call happened to succeed first.
 *
 * There is deliberately NO points total and NO streak counter. The level
 * absorbs the operator's history; the score describes the host's condition
 * right now. Those are two different questions and they are kept apart.
 */

import type {
  Action,
  DiskReport,
  ReleaseSummary,
  ServiceUnit,
  SwapStatus,
} from "../api/types"
import { baseUnitName, pickPrimaryFilesystem } from "./ops-host"
import { WRITABLE_SERVICE_UNITS } from "./ops-constants"

/** The four signals the score is built from. */
export type ScoreSignal = "disk" | "memory" | "services" | "reliability"

export interface ScoreComponent {
  key: ScoreSignal
  label: string
  /** Its share of the score. The four weights sum to 100. */
  weight: number
  /** 0–100, or null when the reading is not available. */
  value: number | null
  /** One line explaining the reading, for the component row. */
  detail: string
}

export interface OpsScore {
  /**
   * The overall score, or null when there is not enough signal to be honest
   * about. A score built from one reading is not a score — it is that one
   * reading wearing a score's clothes.
   */
  score: number | null
  /** How much weight was actually available. Below 50 the score is null. */
  availableWeight: number
  components: ScoreComponent[]
}

const WEIGHTS: Record<ScoreSignal, number> = {
  disk: 30,
  memory: 20,
  services: 25,
  reliability: 25,
}

/**
 * The minimum weight that has to be available before a score is reported at
 * all. Half the weight is the line: below it, one strong reading cannot
 * stand in for the whole host.
 */
const MIN_AVAILABLE_WEIGHT = 50

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function round(value: number): number {
  return Math.round(value)
}

/** Disk headroom: the free percentage of the primary filesystem. */
function diskComponent(
  disk: DiskReport | null | undefined
): ScoreComponent {
  const filesystems = disk?.filesystems ?? []
  const primary = pickPrimaryFilesystem(filesystems)
  if (!primary) {
    return {
      key: "disk",
      label: "Disk headroom",
      weight: WEIGHTS.disk,
      value: null,
      detail: "No disk report yet",
    }
  }
  const used = clamp(primary.used_percent, 0, 100)
  return {
    key: "disk",
    label: "Disk headroom",
    weight: WEIGHTS.disk,
    value: clamp(100 - used, 0, 100),
    detail: `${primary.mount_point || primary.filesystem} is ${Math.round(used)}% used`,
  }
}

/**
 * Memory headroom.
 *
 * Full memory is normal up to 70% — the kernel is using the rest as page
 * cache. Past that the host is genuinely short of memory, so the score
 * falls off linearly to zero at 100%. The reading comes from the swap
 * report because that is the one response that carries the memory totals.
 */
function memoryComponent(
  swap: SwapStatus | null | undefined
): ScoreComponent {
  const memory = swap?.memory
  if (!memory || memory.total_bytes <= 0) {
    return {
      key: "memory",
      label: "Memory headroom",
      weight: WEIGHTS.memory,
      value: null,
      detail: "No memory reading yet",
    }
  }
  const usedPct = clamp((memory.used_bytes / memory.total_bytes) * 100, 0, 100)
  const value = usedPct <= 70 ? 100 : clamp((100 - usedPct) * (100 / 30), 0, 100)
  return {
    key: "memory",
    label: "Memory headroom",
    weight: WEIGHTS.memory,
    value,
    detail: `${Math.round(usedPct)}% of memory in use`,
  }
}

/**
 * Service health.
 *
 * Scored over the CURATED writable units that are actually installed on the
 * host — not over every systemd unit. A host running forty units where
 * thirty-nine are healthy-but-exited (normal for oneshot units) would
 * otherwise score 97 while nginx was dead. The curated set is the one the
 * platform can act on and the one that actually matters.
 */
function servicesComponent(
  services: ServiceUnit[] | null | undefined
): ScoreComponent {
  const curated = services?.filter((unit) =>
    (WRITABLE_SERVICE_UNITS as readonly string[]).includes(baseUnitName(unit.unit))
  )
  if (!curated || curated.length === 0) {
    return {
      key: "services",
      label: "Service health",
      weight: WEIGHTS.services,
      value: null,
      detail: "No managed services found on this host",
    }
  }
  const active = curated.filter((unit) => unit.active_state === "active").length
  const value = (active / curated.length) * 100
  return {
    key: "services",
    label: "Service health",
    weight: WEIGHTS.services,
    value,
    detail: `${active} of ${curated.length} managed services running`,
  }
}

/**
 * Release reliability.
 *
 * Only terminal releases count. A release that is still running is not a
 * failure and must not drag the score down while it is in flight.
 */
function reliabilityComponent(
  releases: ReleaseSummary[] | null | undefined
): ScoreComponent {
  const terminal = (releases ?? []).filter(
    (release) => release.status === "SUCCESS" || release.status === "FAILED"
  )
  if (terminal.length === 0) {
    return {
      key: "reliability",
      label: "Release reliability",
      weight: WEIGHTS.reliability,
      value: null,
      detail: "No completed releases yet",
    }
  }
  const succeeded = terminal.filter(
    (release) => release.status === "SUCCESS"
  ).length
  const value = (succeeded / terminal.length) * 100
  return {
    key: "reliability",
    label: "Release reliability",
    weight: WEIGHTS.reliability,
    value,
    detail: `${succeeded} of ${terminal.length} releases succeeded`,
  }
}

/**
 * Compute the Ops Score.
 *
 * Each signal is independently nullable. A null signal renders as "—" and is
 * excluded from the weighted average rather than counted as zero — a missing
 * reading is not a bad reading.
 */
export function computeOpsScore(input: {
  disk?: DiskReport | null
  swap?: SwapStatus | null
  services?: ServiceUnit[] | null
  releases?: ReleaseSummary[] | null
}): OpsScore {
  const components: ScoreComponent[] = [
    diskComponent(input.disk),
    memoryComponent(input.swap),
    servicesComponent(input.services),
    reliabilityComponent(input.releases),
  ]

  const available = components.filter((c) => c.value !== null)
  const availableWeight = available.reduce((sum, c) => sum + c.weight, 0)

  if (availableWeight < MIN_AVAILABLE_WEIGHT) {
    return { score: null, availableWeight, components }
  }

  const weighted = available.reduce(
    (sum, c) => sum + c.weight * (c.value as number),
    0
  )
  return {
    score: round(weighted / availableWeight),
    availableWeight,
    components,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// The level
// ────────────────────────────────────────────────────────────────────────────

export interface Level {
  index: number
  title: string
  caption: string
  /** Successful operations needed to reach this level. */
  threshold: number
}

/**
 * The levels, in order.
 *
 * Thresholds are on "steps", where a step is a weighted successful
 * operation — a release is worth more than a service control. The step
 * weights are internal: the UI never shows a points total.
 */
export const LEVELS: Level[] = [
  {
    index: 0,
    title: "Novice",
    caption: "You are getting to know this server.",
    threshold: 0,
  },
  {
    index: 1,
    title: "Operator",
    caption: "You run releases and routine changes on this host.",
    threshold: 10,
  },
  {
    index: 2,
    title: "Steward",
    caption: "You keep this host healthy day to day.",
    threshold: 30,
  },
  {
    index: 3,
    title: "Guardian",
    caption: "You protect this host and bring it back when it breaks.",
    threshold: 60,
  },
  {
    index: 4,
    title: "Architect",
    caption: "You shape how this host is operated.",
    threshold: 100,
  },
]

/**
 * How much a successful operation of each type is worth.
 *
 * A release or a rollback changes what is running on the host, so it counts
 * for more than restarting a service. Everything else counts for nothing —
 * a successful backup is not an operation, it is housekeeping.
 */
const STEP_WEIGHTS: Record<string, number> = {
  RELEASE: 3,
  ROLLBACK: 3,
  SWAP_CREATE: 2,
  SERVICE_CONTROL: 1,
}

/**
 * The operator's steps, from the ledger.
 *
 * Only SUCCESS rows count. A failed release is not progress, and it is
 * already counted against the score.
 */
export function computeSteps(actions: Action[]): number {
  return actions.reduce((total, action) => {
    if (action.status !== "SUCCESS") return total
    return total + (STEP_WEIGHTS[action.action_type] ?? 0)
  }, 0)
}

export interface LevelProgress {
  /** The level the operator is at. */
  current: Level
  /** The level above it, or null at the top. */
  next: Level | null
  /** 0–100 toward the next level. */
  progress: number
  /** The raw step count. Shown as "18 of 30", never as points. */
  steps: number
}

export function computeLevel(steps: number): LevelProgress {
  const safeSteps = Number.isFinite(steps) ? Math.max(0, steps) : 0
  const reached = LEVELS.filter((level) => level.threshold <= safeSteps)
  const current = reached.length > 0 ? reached[reached.length - 1] : LEVELS[0]
  const next = LEVELS.find((level) => level.threshold > safeSteps) ?? null
  const progress = next
    ? clamp(
        ((safeSteps - current.threshold) / (next.threshold - current.threshold)) * 100,
        0,
        100
      )
    : 100
  return { current, next, progress, steps: safeSteps }
}

/**
 * The band a score falls into. Used to tint the score bar.
 *
 * The bands are deliberately not "good/bad" — 40 is a working host under
 * pressure, not a broken one.
 *
 * A null score has no band. "Steady" would be a comfortable reading for a
 * host we have not actually measured.
 */
export type ScoreBand = "healthy" | "steady" | "strained" | "critical"

export function scoreBand(score: number | null): ScoreBand | null {
  if (score === null) return null
  if (score >= 80) return "healthy"
  if (score >= 60) return "steady"
  if (score >= 40) return "strained"
  return "critical"
}
