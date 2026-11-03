/**
 * The colour vocabulary of the ops graphics.
 *
 * Kept out of the component file so that the ring and the bar can share one
 * mapping without either of them having to import the other's component.
 */

import {
  DISK_CRITICAL_PERCENT,
  DISK_WARNING_PERCENT,
  MEMORY_CRITICAL_PERCENT,
  MEMORY_WARNING_PERCENT,
} from "../../lib/ops-constants"

export type RingTone =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"

/**
 * The text colour that the graphic inherits.
 *
 * The SVG draws its arc with `currentColor`, so setting the colour on the
 * wrapper is all it takes — no colour is ever written into the graphic
 * itself.
 */
export const ringToneClasses: Record<RingTone, string> = {
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
}

/**
 * The tone for a disk *usage* reading — here a high number is bad.
 *
 * The thresholds are the ones the quests raise on, so a quest that says the
 * filesystem is in trouble and a ring that says it is fine can never appear
 * on the same host at the same time.
 */
export function diskUsageTone(usedPercent: number): RingTone {
  if (usedPercent >= DISK_CRITICAL_PERCENT) return "danger"
  if (usedPercent >= DISK_WARNING_PERCENT) return "warning"
  return "success"
}

/**
 * The tone for a memory *usage* reading — here a high number is bad.
 *
 * Note the direction: the Ops Score's memory component is headroom, where a
 * high number is good. This one is the raw reading off the host.
 */
export function memoryUsageTone(usedPercent: number): RingTone {
  if (usedPercent >= MEMORY_CRITICAL_PERCENT) return "danger"
  if (usedPercent >= MEMORY_WARNING_PERCENT) return "warning"
  return "success"
}
