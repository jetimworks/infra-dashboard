import { useMemo } from "react"
import { useInstance } from "./instances"
import { useInstanceActions } from "./actions"
import { useDiskFiles, useDiskUsage, useServices, useSwapPath, useSwapStatus } from "./system"
import { useReleaseHistory } from "./releases"
import { computeAchievements, type Achievement } from "../lib/achievements"
import {
  computeLevel,
  computeOpsScore,
  computeSteps,
  type LevelProgress,
  type OpsScore,
} from "../lib/ops-score"
import { computeQuests, type Quest } from "../lib/quests"

/**
 * How many ledger rows the achievements are counted from.
 *
 * The backend caps a list at 100 rows, so this is as much of the ledger as
 * one request can return. It is high enough to cover the highest badge
 * (25 successful operations) on a quiet host.
 */
const LEDGER_WINDOW = 100

/** How many releases the reliability signal is read from. */
const RELEASE_WINDOW = 50

export interface OpsSignals {
  /** The Ops Score and its four components. */
  score: OpsScore
  /** The level and the progress toward the next one. */
  level: LevelProgress
  /** All nine badges, earned or not. */
  achievements: Achievement[]
  /** The live, actionable work on this host. */
  quests: Quest[]
  /**
   * True when the ledger holds more rows than one request can return, so
   * the counts above are a floor rather than the whole history. The UI says
   * so rather than implying a complete tally.
   */
  ledgerTruncated: boolean
  /** How many ledger rows were counted from. */
  ledgerCounted: number
  /** How many ledger rows exist in total. */
  ledgerTotal: number
  /** True while any of the source readings are still on their way. */
  loading: boolean
}

/**
 * The operator's progress and the host's condition, in one place.
 *
 * Every reading comes from a query the pages already use, with the same
 * query keys, so nothing is fetched twice: the System page's disk panel and
 * this hook read the same cached row.
 *
 * The host readings are switched off on instances that have no SSH
 * credentials. There is nothing to read on a containerised service, and
 * asking anyway would produce four failing requests on every visit to the
 * instance page. The score then renders as "—", which is the honest reading
 * of "no data", rather than a zero.
 */
export function useOpsSignals(instanceId: string | undefined): OpsSignals {
  const instanceQ = useInstance(instanceId)
  const instance = instanceQ.data ?? null

  const canReadHost = instance?.type === "VPS" && Boolean(instance.host)

  // The same path the swap panel reads. A host whose swap file is not at
  // the default path would otherwise be read at the wrong one, and the
  // fstab check would report a swap that is not persistent when it is.
  const swapPath = useSwapPath(instanceId)

  const diskQ = useDiskUsage(instanceId, { enabled: canReadHost })
  const diskFilesQ = useDiskFiles(instanceId, { enabled: canReadHost })
  const swapQ = useSwapStatus(instanceId, {
    enabled: canReadHost,
    path: swapPath,
  })
  const servicesQ = useServices(instanceId, { enabled: canReadHost })
  const releasesQ = useReleaseHistory(instanceId, { limit: RELEASE_WINDOW })
  const actionsQ = useInstanceActions(instanceId, { limit: LEDGER_WINDOW })

  // Both arrays are memoised so the derivations below are not recomputed on
  // every render: a fresh `[]` each time would make every dependency
  // unstable, and the score would be rebuilt for nothing.
  const actions = useMemo(() => actionsQ.data?.data ?? [], [actionsQ.data])
  const releases = useMemo(
    () => releasesQ.data?.items ?? [],
    [releasesQ.data]
  )

  const score = useMemo(
    () =>
      computeOpsScore({
        disk: diskQ.data ?? null,
        swap: swapQ.data ?? null,
        services: servicesQ.data ?? null,
        releases,
      }),
    [diskQ.data, swapQ.data, servicesQ.data, releases]
  )

  const level = useMemo(
    () => computeLevel(computeSteps(actions)),
    [actions]
  )

  const achievements = useMemo(() => computeAchievements(actions), [actions])

  const quests = useMemo(
    () =>
      computeQuests({
        instanceId: instanceId ?? "",
        instance,
        disk: diskQ.data ?? null,
        diskFiles: diskFilesQ.data ?? null,
        swap: swapQ.data ?? null,
        services: servicesQ.data ?? null,
        releases,
      }),
    [
      instanceId,
      instance,
      diskQ.data,
      diskFilesQ.data,
      swapQ.data,
      servicesQ.data,
      releases,
    ]
  )

  const ledgerTotal = actionsQ.data?.total ?? 0

  return {
    score,
    level,
    achievements,
    quests,
    ledgerTruncated: ledgerTotal > actions.length,
    ledgerCounted: actions.length,
    ledgerTotal,
    loading:
      diskQ.isPending ||
      diskFilesQ.isPending ||
      swapQ.isPending ||
      servicesQ.isPending ||
      releasesQ.isPending ||
      actionsQ.isPending,
  }
}
