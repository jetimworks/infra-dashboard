import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNowStrict, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a byte count for human display (e.g. 1153024 -> "1.1 MB").
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—"
  if (bytes === 0) return "0 B"
  const k = 1024
  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  const value = bytes / Math.pow(k, i)
  return `${value < 10 ? value.toFixed(2) : value.toFixed(1)} ${units[i]}`
}

/**
 * Format an ISO timestamp as a relative phrase ("5 minutes ago").
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return `${formatDistanceToNowStrict(parseISO(iso))} ago`
  } catch {
    return "—"
  }
}

/**
 * Format an ISO timestamp as an absolute date+time ("Jun 21, 2026, 14:00").
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "MMM d, yyyy, HH:mm")
  } catch {
    return "—"
  }
}

/**
 * Format a duration in seconds as "2m 14s".
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "—"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

/**
 * Format a metric value with a unit, picking sensible precision.
 */
export function formatMetric(
  value: number | null | undefined,
  unit: string
): string {
  if (value == null || Number.isNaN(value)) return "—"
  const fixed = value < 10 && value > -10 ? value.toFixed(1) : Math.round(value).toString()
  return `${fixed}${unit}`
}

/**
 * Return the first non-empty initial from a name, uppercase.
 */
export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback
  const trimmed = name.trim()
  if (!trimmed) return fallback
  const first = trimmed[0]?.toUpperCase()
  return first ?? fallback
}
