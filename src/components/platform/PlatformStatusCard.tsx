import {
  Activity,
  CheckCircle2,
  Database,
  RefreshCw,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { ErrorState } from "../ui/ErrorState"
import { LoadingBlock } from "../ui/LoadingState"
import { cn } from "../../lib/utils"
import { formatDuration } from "../../lib/utils"
import type { PlatformHealth } from "../../api/types"

/**
 * The platform's own health.
 *
 * This card is the one place an operator learns the platform itself is
 * unwell before they start work on it. The endpoint answers HTTP 503 when the
 * database or redis is unreachable, and that 503 is a valid answer carrying
 * the detail — so the card branches on the body's `status` and never treats a
 * degraded platform as a broken dashboard.
 *
 * The tone follows the platform: calm when everything answers, amber when a
 * dependency does not. Nothing here pulses or shouts; a dashboard that cries
 * wolf on every poll trains people to ignore it.
 */

export interface PlatformStatusCardProps {
  health: PlatformHealth | undefined
  loading: boolean
  /** Whether a refresh is in flight, for the button's spinner. */
  refreshing: boolean
  error: { message: string } | null
  onRefresh: () => void
}

const CHECK_LABELS: Record<string, string> = {
  database: "Database",
  redis: "Redis",
}

const CHECK_ICONS: Record<string, LucideIcon> = {
  database: Database,
  redis: Zap,
}

export function PlatformStatusCard({
  health,
  loading,
  refreshing,
  error,
  onRefresh,
}: PlatformStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-fg-muted" aria-hidden />
          <CardTitle>Platform</CardTitle>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh platform status"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle transition-colors duration-200 hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
            aria-hidden
          />
        </button>
      </CardHeader>

      {error ? (
        <ErrorState
          title="Couldn't read the platform status"
          description={error.message}
          onRetry={onRefresh}
          className="py-8"
        />
      ) : loading && !health ? (
        <LoadingBlock label="Checking the platform…" className="py-8" />
      ) : health ? (
        <PlatformHealthBody health={health} />
      ) : null}
    </Card>
  )
}

PlatformStatusCard.displayName = "PlatformStatusCard"

/**
 * The health itself, rendered as one verdict plus the checks behind it.
 *
 * The verdict is the sentence an operator reads at a glance; the checks are
 * the diagnosis they read next. The dependency's own state string is shown
 * verbatim — "unreachable" is the platform's word, and it is more useful than
 * a paraphrase.
 */
function PlatformHealthBody({ health }: { health: PlatformHealth }) {
  const healthy = health.status === "ok"
  const degraded = health.status === "degraded"
  const checks = Object.entries(health.checks ?? {})

  const verdict = healthy
    ? "All checks passed"
    : degraded
      ? "Some checks are failing"
      : "Platform status is unknown"

  const note = healthy
    ? "The database and the cache are both answering."
    : degraded
      ? "One or more dependencies are unreachable. Deploys and releases may fail until this clears."
      : "The platform reported a status this dashboard does not recognise."

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            healthy
              ? "bg-success-soft text-success-fg"
              : degraded
                ? "bg-warning-soft text-warning-fg"
                : "bg-surface-sunken text-fg-muted"
          )}
          aria-hidden
        >
          {healthy ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <TriangleAlert className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold text-fg">{verdict}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{note}</p>
          <p className="mt-2 text-xs text-fg-subtle">
            Up for {formatDuration(health.uptime_seconds)}
          </p>
        </div>
      </div>

      {checks.length > 0 ? (
        <ul className="flex shrink-0 gap-6 sm:flex-col sm:gap-2.5">
          {checks.map(([name, state]) => (
            <CheckRow key={name} name={name} state={state} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function CheckRow({ name, state }: { name: string; state: string }) {
  const ok = state === "ok"
  const Icon = CHECK_ICONS[name] ?? Activity

  return (
    <li className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
      <span className="text-sm text-fg-muted">
        {CHECK_LABELS[name] ?? name}
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          ok ? "text-success-fg" : "text-danger-fg"
        )}
      >
        {state}
      </span>
    </li>
  )
}
