/**
 * Quests — the live, actionable work on a host.
 *
 * A quest is a condition that is true RIGHT NOW and that the operator can
 * do something about. They clear themselves when the condition clears, which
 * is what separates them from achievements: an achievement is a record of
 * what you did, a quest is a thing waiting to be done.
 *
 * Like the score, this is a pure function. Everything it reads is passed in.
 */

import type {
  BigFilesResponse,
  DiskReport,
  ReleaseSummary,
  ServiceUnit,
  SwapStatus,
} from "../api/types"
import { baseUnitName, pickPrimaryFilesystem } from "./ops-host"
import {
  DISK_CRITICAL_PERCENT,
  DISK_WARNING_PERCENT,
  HOST_WIDE_SERVICE_UNITS,
  MEMORY_CRITICAL_PERCENT,
  WRITABLE_SERVICE_UNITS,
} from "./ops-constants"
import { resolveServiceName } from "./service-name"

export type QuestSeverity = "critical" | "warning" | "info"

/** Which reading raised the quest. */
export type QuestSource = "disk" | "files" | "swap" | "services" | "releases"

export interface Quest {
  id: string
  title: string
  /** Why it matters, with the numbers in it. */
  why: string
  severity: QuestSeverity
  source: QuestSource
  /** Where the operator goes to deal with it. */
  actionHref: string
  /** The label on the action button. */
  cta?: string
}

export interface QuestInput {
  instanceId: string
  /** The instance, for its own application unit. */
  instance?: { service_name?: string | null } | null
  disk?: DiskReport | null
  diskFiles?: BigFilesResponse | null
  swap?: SwapStatus | null
  services?: ServiceUnit[] | null
  releases?: ReleaseSummary[] | null
}

const SEVERITY_ORDER: Record<QuestSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

/**
 * Order releases by when they started.
 *
 * A row whose timestamp will not parse sorts first, so it can never be
 * mistaken for the most recent release. `Date.parse` returning NaN inside a
 * sort comparator would otherwise leave the ordering up to the engine.
 */
function byStartedAt(a: ReleaseSummary, b: ReleaseSummary): number {
  const left = Date.parse(a.started_at)
  const right = Date.parse(b.started_at)
  if (Number.isNaN(left) && Number.isNaN(right)) return 0
  if (Number.isNaN(left)) return -1
  if (Number.isNaN(right)) return 1
  return left - right
}

/**
 * The quests raised by a host's current state.
 *
 * Sorted critical first, then by severity, then alphabetically — so the
 * thing that would page someone is always the first line.
 */
export function computeQuests(input: QuestInput): Quest[] {
  const { instanceId, instance } = input
  const quests: Quest[] = []

  const systemHref = (hash: string) =>
    `/instances/${instanceId}/system#${hash}`

  // ── Disk ────────────────────────────────────────────────────────────────
  const filesystems = input.disk?.filesystems ?? []
  const primary = pickPrimaryFilesystem(filesystems)
  if (primary && primary.used_percent >= DISK_WARNING_PERCENT) {
    const used = Math.round(primary.used_percent)
    quests.push({
      id: "disk_pressure",
      title: "Free space running low on /",
      why: `${primary.mount_point || "/"} is ${used}% full. Builds and logs start failing well before it reaches 100%.`,
      severity:
        primary.used_percent >= DISK_CRITICAL_PERCENT ? "critical" : "warning",
      source: "disk",
      actionHref: systemHref("disk"),
      cta: "Review disk usage",
    })
  }

  // ── Large files ─────────────────────────────────────────────────────────
  const bigFiles = input.diskFiles?.files ?? []
  if (bigFiles.length > 0) {
    const threshold = input.diskFiles?.min_size_mb ?? 100
    const path = input.diskFiles?.path ?? "/var"
    quests.push({
      id: "big_files",
      title: `${bigFiles.length} ${plural(bigFiles.length, "file", "files")} over ${threshold} MB in ${path}`,
      why: "These are the largest files on the host. Nothing here deletes anything — review them and clear up deliberately.",
      severity: "info",
      source: "files",
      actionHref: systemHref("files"),
      cta: "List large files",
    })
  }

  // ── Swap ────────────────────────────────────────────────────────────────
  const swap = input.swap
  if (swap) {
    if (!swap.exists) {
      quests.push({
        id: "swap_missing",
        title: "This host has no swap space",
        why: "Without swap, a memory spike becomes an out-of-memory kill instead of a slowdown.",
        severity: "warning",
        source: "swap",
        actionHref: systemHref("swap"),
        cta: "Add swap space",
      })
    } else if (!swap.in_fstab) {
      quests.push({
        id: "swap_not_persistent",
        title: "Swap will not survive a restart",
        why: `The swap file at ${swap.path} is not in /etc/fstab, so it is gone after the next reboot.`,
        severity: "warning",
        source: "swap",
        actionHref: systemHref("swap"),
        cta: "Make swap persistent",
      })
    }

    const memory = swap.memory
    if (memory && memory.total_bytes > 0) {
      const usedPct = (memory.used_bytes / memory.total_bytes) * 100
      if (usedPct >= MEMORY_CRITICAL_PERCENT) {
        quests.push({
          id: "memory_pressure",
          title: "Memory is nearly full",
          why: `${Math.round(usedPct)}% of memory is in use. Processes get killed outright once it reaches 100%.`,
          severity: "critical",
          source: "swap",
          actionHref: systemHref("swap"),
          cta: "Review memory",
        })
      }
    }
  }

  // ── Services ────────────────────────────────────────────────────────────
  const appUnit = instance ? baseUnitName(resolveServiceName(instance)) : null
  for (const unit of input.services ?? []) {
    const base = baseUnitName(unit.unit)
    const isCurated = (WRITABLE_SERVICE_UNITS as readonly string[]).includes(base)
    const isAppUnit = appUnit !== null && base === appUnit
    // Only units the operator can act on. A host running forty inactive
    // oneshot units does not get forty quests.
    if (!isCurated && !isAppUnit) continue
    if (unit.active_state === "active") continue

    const isHostWide = (HOST_WIDE_SERVICE_UNITS as readonly string[]).includes(base)
    quests.push({
      id: `service_${base}`,
      title: `${base} is not running`,
      why: `systemd reports it as ${unit.active_state}${
        unit.sub_state ? ` (${unit.sub_state})` : ""
      }.`,
      severity: isHostWide || unit.sub_state === "failed" ? "critical" : "warning",
      source: "services",
      actionHref: isAppUnit
        ? `/instances/${instanceId}/app-control`
        : systemHref("services"),
      cta: isAppUnit ? "Open app control" : "Manage service",
    })
  }

  // ── Releases ────────────────────────────────────────────────────────────
  const releases = input.releases ?? []
  const terminal = releases.filter(
    (release) => release.status === "SUCCESS" || release.status === "FAILED"
  )
  if (terminal.length > 0) {
    // The API returns newest-first, but the comparison does not depend on
    // the server's ordering being right.
    const ordered = [...terminal].sort(byStartedAt)
    const latest = ordered[ordered.length - 1]
    if (latest.status === "FAILED") {
      quests.push({
        id: "release_failed",
        title: "The last release did not finish",
        why: latest.error_message
          ? `The release of ${latest.sha} failed: ${latest.error_message}`
          : `The release of ${latest.sha} failed.`,
        severity: "warning",
        source: "releases",
        actionHref: `/instances/${instanceId}/releases`,
        cta: "Open the release",
      })
    }
  }

  const inFlight = releases.filter(
    (release) => release.status === "PENDING" || release.status === "RUNNING"
  )
  if (inFlight.length > 0) {
    quests.push({
      id: "release_in_flight",
      title: `${inFlight.length} ${plural(inFlight.length, "release is", "releases are")} still running`,
      why: "Work is in flight on this host. The history shows each stage as it completes.",
      severity: "info",
      source: "releases",
      actionHref: `/instances/${instanceId}/releases`,
      cta: "Watch it run",
    })
  }

  return quests.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (bySeverity !== 0) return bySeverity
    return a.title.localeCompare(b.title)
  })
}
