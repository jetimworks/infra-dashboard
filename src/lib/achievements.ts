/**
 * Achievements, derived from the actions ledger.
 *
 * Every badge here is a statement about what the operator has DONE, not
 * about the host's current condition. A live condition — the disk is full,
 * nginx is down — belongs in Quests, which come and go. An achievement is
 * earned and stays earned.
 *
 * The ledger is the only input. The rules count rows, look at their status,
 * and find the row that satisfied them, so a badge can say WHEN it was
 * earned rather than only that it was.
 */

import type { Action } from "../api/types"

/** The four operation types the platform's own tooling produces. */
export const OPS_ACTION_TYPES = [
  "RELEASE",
  "ROLLBACK",
  "SWAP_CREATE",
  "SERVICE_CONTROL",
] as const

export interface Achievement {
  id: string
  name: string
  /** One line on what earning this badge means. */
  description: string
  /** The unlock rule, shown verbatim on a locked badge. */
  rule: string
  earned: boolean
  /** The `started_at` of the row that satisfied the rule, or null. */
  earnedAt: string | null
  /** How far along the operator is. Shown on a locked badge. */
  progress: string
}

/**
 * Compare two timestamps.
 *
 * The ledger is ordered `started_at DESC`, so the sort here is the whole
 * reason `earnedAt` can name a specific row. Timestamps that fail to parse
 * sort last rather than poisoning the comparison — a row with an unreadable
 * date should not be able to reorder the rest.
 */
function compareTimestamps(left: string, right: string): number {
  const a = Date.parse(left)
  const b = Date.parse(right)
  if (Number.isNaN(a) && Number.isNaN(b)) return 0
  if (Number.isNaN(a)) return 1
  if (Number.isNaN(b)) return -1
  return a - b
}

/**
 * The ledger, oldest first.
 *
 * The API returns newest-first, so every "the Nth success" rule needs a copy
 * in the other order. Sorting a copy — never the caller's array — keeps the
 * caller's data untouched.
 */
function sortOldestFirst(actions: Action[]): Action[] {
  return [...actions].sort((a, b) => {
    const primary = compareTimestamps(a.started_at, b.started_at)
    if (primary !== 0) return primary
    const secondary = compareTimestamps(a.created_at, b.created_at)
    if (secondary !== 0) return secondary
    return a.id.localeCompare(b.id)
  })
}

interface LedgerIndex {
  /** SUCCESS rows of one action type, oldest first. */
  successesOf(type: string): Action[]
  /** All rows of one action type, oldest first. */
  rowsOf(type: string): Action[]
  /** SUCCESS rows of the four ops types, oldest first. */
  opsSuccesses: Action[]
  /** FAILED rows of the four ops types, oldest first. */
  opsFailures: Action[]
  /** The three most recent RELEASE rows, newest first. */
  recentReleases: Action[]
}

function buildIndex(actions: Action[]): LedgerIndex {
  const oldest = sortOldestFirst(actions)
  const isOpsType = (action: Action) =>
    (OPS_ACTION_TYPES as readonly string[]).includes(action.action_type)

  return {
    successesOf: (type) =>
      oldest.filter((a) => a.action_type === type && a.status === "SUCCESS"),
    rowsOf: (type) => oldest.filter((a) => a.action_type === type),
    opsSuccesses: oldest.filter((a) => isOpsType(a) && a.status === "SUCCESS"),
    opsFailures: oldest.filter((a) => isOpsType(a) && a.status === "FAILED"),
    recentReleases: oldest
      .filter((a) => a.action_type === "RELEASE")
      .slice(-3)
      .reverse(),
  }
}

/** "3 of 10 successful service controls" — clamped so an earned badge reads cleanly. */
function countProgress(count: number, target: number, noun: string): string {
  return `${Math.min(count, target)} of ${target} ${noun}`
}

interface Rule {
  id: string
  name: string
  description: string
  rule: string
  evaluate(index: LedgerIndex): {
    earned: boolean
    earnedAt: string | null
    progress: string
  }
}

/**
 * A rule of the shape "the Nth qualifying success earns this".
 *
 * The Nth success is found in ascending `started_at` order, so the badge
 * names the moment it was earned rather than the most recent matching row.
 */
function countRule(options: {
  id: string
  name: string
  description: string
  rule: string
  type: string
  target: number
  noun: string
}): Rule {
  return {
    ...options,
    evaluate(index) {
      const successes = index.successesOf(options.type)
      const earned = successes.length >= options.target
      return {
        earned,
        earnedAt: earned ? successes[options.target - 1].started_at : null,
        progress: countProgress(successes.length, options.target, options.noun),
      }
    },
  }
}

const RULES: Rule[] = [
  countRule({
    id: "first_deploy",
    name: "First Deploy",
    description: "You shipped your first release to this host.",
    rule: "Complete 1 successful release",
    type: "RELEASE",
    target: 1,
    noun: "successful release",
  }),
  countRule({
    id: "rollback_rescue",
    name: "Rollback Rescue",
    description: "You put a bad release back the way it was.",
    rule: "Complete 1 successful rollback",
    type: "ROLLBACK",
    target: 1,
    noun: "successful rollback",
  }),
  countRule({
    id: "service_whisperer",
    name: "Service Whisperer",
    description: "You have managed the host's services ten times over.",
    rule: "Complete 10 successful service controls",
    type: "SERVICE_CONTROL",
    target: 10,
    noun: "successful service controls",
  }),
  countRule({
    id: "swap_guardian",
    name: "Swap Guardian",
    description: "You gave the host room to breathe under pressure.",
    rule: "Create swap space successfully",
    type: "SWAP_CREATE",
    target: 1,
    noun: "successful swap creation",
  }),
  countRule({
    id: "backup_keeper",
    name: "Backup Keeper",
    description: "You have kept the backups turning over for a while now.",
    rule: "Complete 10 successful backups",
    type: "BACKUP",
    target: 10,
    noun: "successful backups",
  }),
  countRule({
    id: "restore_captain",
    name: "Restore Captain",
    description: "You brought a backup back to life.",
    rule: "Restore a backup successfully",
    type: "RESTORE",
    target: 1,
    noun: "successful restore",
  }),
  {
    id: "steady_hand",
    name: "Steady Hand",
    description: "Your last three releases all landed cleanly.",
    rule: "Have your last 3 releases all succeed",
    evaluate(index) {
      const recent = index.recentReleases
      const succeeded = recent.filter((a) => a.status === "SUCCESS").length
      // At least three releases have to exist. With fewer, "the last three
      // all succeeded" would be true of somebody who has never released
      // anything, which is not what the badge means.
      const earned = recent.length >= 3 && succeeded === recent.length
      const successes = index.successesOf("RELEASE")
      const earnedAt =
        earned && successes.length >= 3
          ? successes[successes.length - 3].started_at
          : null
      return {
        earned,
        earnedAt,
        progress: `${succeeded} of 3 recent releases succeeded`,
      }
    },
  },
  {
    id: "clean_record",
    name: "Clean Record",
    description: "Twelve clean operations and not one failure among them.",
    rule: "Complete 12 successful operations with no failures",
    evaluate(index) {
      const successes = index.opsSuccesses
      const failures = index.opsFailures
      const earned = successes.length >= 12 && failures.length === 0
      return {
        earned,
        earnedAt: earned ? successes[11].started_at : null,
        progress:
          failures.length > 0
            ? `${successes.length} of 12 successful operations, ${failures.length} failed`
            : countProgress(successes.length, 12, "successful operations"),
      }
    },
  },
  {
    id: "trusted_operator",
    name: "Trusted Operator",
    description: "Twenty-five successful operations on this host.",
    rule: "Complete 25 successful operations",
    evaluate(index) {
      const successes = index.opsSuccesses
      const earned = successes.length >= 25
      return {
        earned,
        earnedAt: earned ? successes[24].started_at : null,
        progress: countProgress(successes.length, 25, "successful operations"),
      }
    },
  },
]

/**
 * Every achievement, earned or not.
 *
 * The list always has all nine in a fixed order, so the grid does not
 * reshuffle as the operator progresses — a badge that moves when it is
 * earned reads as noise.
 */
export function computeAchievements(actions: Action[]): Achievement[] {
  const index = buildIndex(actions)
  return RULES.map((rule) => {
    const result = rule.evaluate(index)
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      rule: rule.rule,
      earned: result.earned,
      earnedAt: result.earnedAt,
      progress: result.progress,
    }
  })
}

/** How many of the nine badges have been earned. */
export function earnedAchievementCount(achievements: Achievement[]): number {
  return achievements.filter((achievement) => achievement.earned).length
}
