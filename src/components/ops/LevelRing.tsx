import { RingGauge } from "./RingGauge"
import type { LevelProgress } from "../../lib/ops-score"

/**
 * The level ring.
 *
 * The arc is progress toward the NEXT level, not progress through the
 * current one — the number in the centre is the level itself. The line
 * beneath is the plain progress readout a level bar needs: how many
 * successful operations, out of how many more.
 *
 * There is no points total anywhere. The number here is a position on a
 * ladder, not a score.
 */

export interface LevelRingProps {
  level: LevelProgress
  size?: number
  className?: string
}

export function LevelRing({ level, size = 132, className }: LevelRingProps) {
  const { current, next, steps, progress } = level

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-3">
        <RingGauge
          value={progress}
          size={size}
          tone="accent"
          label={`Level ${current.index}, ${current.title}. ${
            next
              ? `${steps} of ${next.threshold} successful operations`
              : "Top level reached"
          }.`}
        >
          <span className="text-[1.75rem] font-bold leading-none tabular-nums text-fg">
            {current.index}
          </span>
        </RingGauge>
        <div className="text-center">
          <p className="text-sm font-semibold text-fg">{current.title}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {next
              ? `${steps} of ${next.threshold} successful operations`
              : `${steps} successful operations`}
          </p>
        </div>
      </div>
    </div>
  )
}
