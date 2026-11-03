import { type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../../lib/utils"
import { EASE_OUT_QUART } from "../../lib/motion"
import { ringToneClasses, type RingTone } from "./ring-tone"

/**
 * The thin ring the whole progression graphic is built on.
 *
 * One 100×100 canvas, one track, one arc. The arc is drawn with
 * `currentColor` and the colour comes from the wrapper's text colour, so no
 * colour is ever written into the SVG itself — the ring changes tone by
 * changing a class on its parent, exactly like every other surface in the
 * app.
 *
 * The stroke is `non-scaling-stroke`, so `strokeWidth` is in real pixels at
 * every size. Without it the 100-unit canvas would scale the stroke with
 * the ring and a "6" would mean something different on every gauge.
 */

const CANVAS = 100
const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export interface RingGaugeProps {
  /** 0–100, or null when there is no reading to draw. */
  value: number | null
  size?: number
  strokeWidth?: number
  tone?: RingTone
  /** The centre of the ring. */
  children?: ReactNode
  /** Read out to assistive technology. The graphic itself is hidden from it. */
  label?: string
  className?: string
}

export function RingGauge({
  value,
  size = 132,
  strokeWidth = 6,
  tone = "primary",
  children,
  label,
  className,
}: RingGaugeProps) {
  const prefersReducedMotion = useReducedMotion()
  const clamped = value == null ? null : Math.min(100, Math.max(0, value))
  // A null reading draws no arc at all — an empty track, not a full ring and
  // not a zero-length stub.
  const offset =
    clamped == null ? CIRCUMFERENCE : CIRCUMFERENCE * (1 - clamped / 100)

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        ringToneClasses[tone],
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={CANVAS / 2}
          cy={CANVAS / 2}
          r={RADIUS}
          fill="none"
          stroke="rgb(var(--surface-sunken))"
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <motion.circle
          cx={CANVAS / 2}
          cy={CANVAS / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          vectorEffect="non-scaling-stroke"
          initial={
            prefersReducedMotion ? false : { strokeDashoffset: CIRCUMFERENCE }
          }
          animate={{ strokeDashoffset: offset }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.5, ease: EASE_OUT_QUART }
          }
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : null}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}
