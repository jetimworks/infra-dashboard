import { Card } from "../ui/Card"
import { ProgressBar } from "./ProgressBar"
import { LevelRing } from "./LevelRing"
import { ringToneClasses, type RingTone } from "./ring-tone"
import {
  scoreBand,
  type LevelProgress,
  type OpsScore,
  type ScoreBand,
} from "../../lib/ops-score"
import { cn } from "../../lib/utils"

/**
 * The Ops Score card — the headline graphic of the instance page.
 *
 * Two columns: the level ring on the left, the score and its four
 * components on the right.
 *
 * The score is an integer, or a dash. A dash means there was not enough
 * signal to be honest about the host, and it is never dressed up as a zero
 * — a host that cannot be read is not a host in trouble.
 */

const bandMeta: Record<ScoreBand, { label: string; tone: RingTone }> = {
  healthy: { label: "Healthy", tone: "success" },
  steady: { label: "Steady", tone: "primary" },
  strained: { label: "Under pressure", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
}

/** The tone of a single component reading, on the same bands as the score. */
function componentTone(value: number | null): RingTone {
  const band = scoreBand(value)
  return band === null ? "primary" : bandMeta[band].tone
}

export interface OpsScoreCardProps {
  score: OpsScore
  level: LevelProgress
  className?: string
}

export function OpsScoreCard({ score, level, className }: OpsScoreCardProps) {
  const band = scoreBand(score.score)
  const bandInfo = band ? bandMeta[band] : null

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0 sm:pt-1">
          <LevelRing level={level} />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-fg-muted">Ops Score</span>
              {bandInfo ? (
                <span
                  className={cn(
                    "text-xs font-medium",
                    ringToneClasses[bandInfo.tone]
                  )}
                >
                  {bandInfo.label}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-[2.5rem] font-bold leading-none tabular-nums text-fg">
                {score.score ?? "—"}
              </span>
              {score.score === null ? (
                <span className="text-sm text-fg-subtle">
                  Not enough readings yet
                </span>
              ) : null}
            </div>
            <ProgressBar
              className="mt-3"
              value={score.score}
              tone={bandInfo?.tone ?? "primary"}
              label={
                score.score === null
                  ? "Ops Score unavailable"
                  : `Ops Score ${score.score} of 100`
              }
            />
          </div>

          <div className="space-y-4 border-t border-border/40 pt-4">
            {score.components.map((component) => (
              <div key={component.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-fg-muted">{component.label}</span>
                  <span className="font-medium tabular-nums text-fg">
                    {component.value === null
                      ? "—"
                      : Math.round(component.value)}
                  </span>
                </div>
                <ProgressBar
                  className="mt-1.5"
                  value={component.value}
                  tone={componentTone(component.value)}
                  label={`${component.label}: ${
                    component.value === null
                      ? "unavailable"
                      : Math.round(component.value)
                  }`}
                />
                <p className="mt-1 text-xs text-fg-subtle">{component.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
