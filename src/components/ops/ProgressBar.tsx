import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../../lib/utils"
import { EASE_OUT_QUART } from "../../lib/motion"
import { ringToneClasses, type RingTone } from "./ring-tone"

/**
 * A hairline progress bar.
 *
 * Deliberately NOT `components/data/MetricBar.tsx`: that bar colours its
 * fill by THRESHOLD, so a healthy 10% reading renders red. This one is a
 * progress bar — the fill IS the value — and the tone is passed in by the
 * caller, who knows what the number means.
 */

export interface ProgressBarProps {
  /** 0–100, or null when there is no reading to show. */
  value: number | null
  tone?: RingTone
  className?: string
  /** Read out to assistive technology. */
  label?: string
}

export function ProgressBar({
  value,
  tone = "primary",
  className,
  label,
}: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion()
  const clamped = value == null ? null : Math.min(100, Math.max(0, value))

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken",
        className
      )}
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuenow={clamped ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full", ringToneClasses[tone])}
        initial={prefersReducedMotion ? false : { width: "0%" }}
        animate={{ width: `${clamped ?? 0}%` }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.3, ease: EASE_OUT_QUART }
        }
      />
    </div>
  )
}
