import { Fragment } from "react"
import {
  CheckCircle2,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../../lib/utils"
import {
  RELEASE_STAGE_LABELS,
  RELEASE_STAGE_ORDER,
} from "../../lib/ops-constants"
import type { ReleaseStageStatus } from "../../api/types"

/**
 * The release pipeline, drawn.
 *
 * The pipeline is four stages that run in a fixed order over SSH. This
 * stepper shows where a release got to, and — just as importantly — what it
 * never reached.
 *
 * Two things are easy to get wrong here and both are handled explicitly:
 *
 *   - **A stage that is ABSENT has not run yet.** That is "Waiting", not
 *     "Skipped". The backend only writes a `SKIPPED` stage when a stage was
 *     entered and deliberately bypassed. A release that failed at `deploy`
 *     reports `deploy` as FAILED and `restore_branch` as SKIPPED, but a
 *     release that has not reached `deploy` yet reports nothing for it at
 *     all. The two look the same in a naive implementation and they mean
 *     opposite things, so absence renders as its own state.
 *
 *   - **The stage list is the backend's, not ours.** The four canonical
 *     stages are always drawn, in the canonical order, so a release that
 *     reports its stages out of order or with an extra entry still reads
 *     correctly.
 */

/** The minimal shape the stepper needs; both the summary and the detail fit. */
export interface StepperStage {
  name: string
  status: ReleaseStageStatus
  exit_code?: number
  started_at?: string | null
  completed_at?: string | null
}

/** "Waiting" is our word for a stage the backend never reported. */
type StepperStatus = ReleaseStageStatus | "WAITING"

interface StatusMeta {
  /** The word shown under the stage name. */
  label: string
  /** The node's own styling. */
  node: string
  /** The label's styling. */
  text: string
  icon?: LucideIcon
  /** Whether the icon spins. */
  spin?: boolean
}

const STATUS_META: Record<StepperStatus, StatusMeta> = {
  WAITING: {
    label: "Waiting",
    node: "border border-border bg-surface",
    text: "text-fg-subtle",
  },
  PENDING: {
    label: "Pending",
    node: "border border-border bg-surface",
    text: "text-fg-subtle",
  },
  RUNNING: {
    label: "Running",
    node: "bg-info-soft text-info-fg ring-1 ring-inset ring-info/30",
    text: "text-info-fg",
    icon: Loader2,
    spin: true,
  },
  SUCCESS: {
    label: "Done",
    node: "bg-success-soft text-success-fg ring-1 ring-inset ring-success/30",
    text: "text-success-fg",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    node: "bg-danger-soft text-danger-fg ring-1 ring-inset ring-danger/30",
    text: "text-danger-fg",
    icon: XCircle,
  },
  SKIPPED: {
    label: "Skipped",
    node: "border border-dashed border-border-strong bg-surface",
    text: "text-fg-subtle",
  },
}

/**
 * The connector between two stages carries the previous stage's verdict:
 * green after a success, red after a failure, dashed after a skip.
 *
 * The dashed case is drawn with a border rather than a background, because a
 * 1px dashed line is not expressible as a background. The border sits on the
 * left edge on mobile and the top edge on desktop, so it always runs along
 * the same axis as the connector itself.
 */
function connectorClasses(status: StepperStatus): string {
  if (status === "SUCCESS") return "bg-success/40"
  if (status === "FAILED") return "bg-danger/40"
  if (status === "SKIPPED") {
    return "border-l border-dashed border-border-strong sm:border-l-0 sm:border-t"
  }
  return "bg-border"
}

/** How long a stage took, from its own timestamps. */
function stageDuration(stage: StepperStage | undefined): string | null {
  if (!stage?.started_at || !stage?.completed_at) return null
  const started = Date.parse(stage.started_at)
  const completed = Date.parse(stage.completed_at)
  if (Number.isNaN(started) || Number.isNaN(completed)) return null
  const seconds = Math.round((completed - started) / 1000)
  if (seconds < 0) return null
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export interface ReleaseStageStepperProps {
  /** The stages the backend reported. */
  stages: StepperStage[] | null | undefined
  className?: string
}

export function ReleaseStageStepper({
  stages,
  className,
}: ReleaseStageStepperProps) {
  const reported = new Map<string, StepperStage>()
  for (const stage of stages ?? []) {
    reported.set(stage.name, stage)
  }

  // The canonical order is what the backend runs, so it is what we draw.
  const ordered = RELEASE_STAGE_ORDER.map((name) => ({
    name,
    stage: reported.get(name),
  }))

  // Anything the backend reported that is NOT one of the four canonical
  // stages is still shown — appended, so an unexpected stage is visible
  // rather than silently dropped.
  const extras = (stages ?? []).filter(
    (stage) =>
      !(RELEASE_STAGE_ORDER as readonly string[]).includes(stage.name)
  )

  const rows = [
    ...ordered.map((entry) => ({
      name: entry.name,
      stage: entry.stage,
      status: (entry.stage?.status ?? "WAITING") as StepperStatus,
    })),
    ...extras.map((stage) => ({
      name: stage.name,
      stage,
      status: stage.status as StepperStatus,
    })),
  ]

  return (
    <ol className={cn("flex flex-col sm:flex-row sm:items-start", className)}>
      {rows.map((row, index) => {
        const previous = index > 0 ? rows[index - 1] : null
        const meta = STATUS_META[row.status] ?? STATUS_META.WAITING
        const duration = stageDuration(row.stage)
        const Icon = meta.icon

        return (
          <Fragment key={`${row.name}-${index}`}>
            {previous ? (
              <span
                aria-hidden
                className={cn(
                  "ml-4 h-5 w-px shrink-0 self-start sm:ml-0 sm:mt-4 sm:h-px sm:w-8",
                  connectorClasses(previous.status)
                )}
              />
            ) : null}

            <li className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  meta.node
                )}
              >
                {Icon ? (
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      meta.spin ? "animate-spin" : undefined
                    )}
                    aria-hidden
                  />
                ) : null}
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">
                  {RELEASE_STAGE_LABELS[row.name] ?? row.name}
                </span>
                <span className={cn("block text-xs", meta.text)}>
                  {meta.label}
                  {row.stage && row.stage.exit_code ? (
                    <span className="text-fg-subtle">
                      {" · "}exit {row.stage.exit_code}
                    </span>
                  ) : null}
                </span>
                {duration ? (
                  <span className="block text-xs text-fg-subtle">{duration}</span>
                ) : null}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

ReleaseStageStepper.displayName = "ReleaseStageStepper"
