import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock, Loader2, CheckCircle2, XCircle, StopCircle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"
import { StatusPill } from "../ui/StatusPill"
import { qk } from "../../lib/query-keys"
import { actionsApi } from "../../api/actions"
import type { Action, ActionStatus } from "../../api/types"

export interface AsyncActionTrackerProps {
  actionId: string
  initialStatus?: ActionStatus
  label: string
  /** When the action finishes successfully. */
  onComplete?: (action: Action) => void
  /** When the action fails. */
  onError?: (action: Action) => void
  /** How often to poll while the action is non-terminal. */
  pollIntervalMs?: number
  /** When to give up on auto-polling and ask the user if they want to keep waiting. */
  timeoutMs?: number
  /** "Stop waiting" button — the action continues server-side. */
  onStop?: () => void
  className?: string
}

const TERMINAL: ActionStatus[] = ["SUCCESS", "FAILED"]

/**
 * The single primitive that handles every "trigger returns 202, poll until
 * terminal" UX. Used by backup trigger, backup restore, SSL renewal, system
 * action, and any future async operation. Mounts inside a Dialog/Drawer so
 * the user can navigate while tracking, or inline in a panel.
 */
export function AsyncActionTracker({
  actionId,
  initialStatus = "PENDING",
  label,
  onComplete,
  onError,
  pollIntervalMs = 2000,
  timeoutMs = 5 * 60_000,
  onStop,
  className,
}: AsyncActionTrackerProps) {
  const [stopped, setStopped] = useState(false)
  const [startedAt] = useState(() => Date.now())

  const { data: action, isError, error } = useQuery<Action>({
    queryKey: qk.action(actionId),
    queryFn: () => actionsApi.get(actionId),
    initialData: { id: actionId, status: initialStatus } as unknown as Action,
    refetchInterval: (q) => {
      if (stopped) return false
      const status = q.state.data?.status
      if (!status) return pollIntervalMs
      if (TERMINAL.includes(status)) return false
      // Switch to slower backoff past the timeout.
      const elapsed = Date.now() - startedAt
      return elapsed > timeoutMs ? 10_000 : pollIntervalMs
    },
    enabled: !stopped,
  })

  // Fire callbacks exactly once on terminal state.
  useEffect(() => {
    if (!action) return
    if (action.status === "SUCCESS") {
      onComplete?.(action)
    } else if (action.status === "FAILED") {
      onError?.(action)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.status])

  const status: ActionStatus = action?.status ?? initialStatus
  // Tick once per second while non-terminal so pastTimeout stays current.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (TERMINAL.includes(status)) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [status])
  // eslint-disable-next-line react-hooks/purity
  const elapsedMs = Date.now() - startedAt
  const pastTimeout = elapsedMs > timeoutMs

  return (
    <div
      className={cn(
        "rounded-lg bg-surface p-5 shadow-[var(--shadow-card)] border-b border-l border-border/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] text-fg-muted">Working on it</p>
          <h3 className="mt-0.5 truncate text-[1.0625rem] font-semibold text-fg">
            {label}
          </h3>
        </div>
        <StatusPill status={status} size="sm" />
      </div>

      <div className="mt-4">
        <StatusBody
          status={status}
          errorMessage={action?.error_message}
          queryError={isError ? (error as Error) : null}
          pastTimeout={pastTimeout}
        />
      </div>

      <ProgressBar status={status} elapsedMs={elapsedMs} timeoutMs={timeoutMs} />

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3 text-xs text-fg-muted">
        <span>{action?.id ? `Action ${action.id.slice(0, 8)}` : null}</span>
        {TERMINAL.includes(status) ? null : (
          <div className="flex items-center gap-2">
            {pastTimeout ? (
              <span className="text-warning-fg">
                Taking longer than expected
              </span>
            ) : null}
            {onStop ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStopped(true)
                  onStop()
                }}
                leftIcon={StopCircle}
              >
                Stop waiting
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressBar({
  status,
  elapsedMs,
  timeoutMs,
}: {
  status: ActionStatus
  elapsedMs: number
  timeoutMs: number
}) {
  if (TERMINAL.includes(status)) {
    return (
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          className={cn(
            "h-full rounded-full",
            status === "SUCCESS" ? "bg-success" : "bg-danger"
          )}
          initial={{ width: "60%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>
    )
  }
  // Indeterminate-feel progress: cap at 90% until terminal.
  const ratio = Math.min(0.9, (elapsedMs / timeoutMs) * 0.9)
  return (
    <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
      <motion.div
        className="h-full rounded-full bg-info"
        initial={{ width: 0 }}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      />
    </div>
  )
}

AsyncActionTracker.displayName = "AsyncActionTracker"

function StatusBody({
  status,
  errorMessage,
  queryError,
  pastTimeout,
}: {
  status: ActionStatus
  errorMessage?: string | null
  queryError: Error | null
  pastTimeout: boolean
}) {
  if (queryError) {
    return (
      <p className="text-sm text-danger-fg">
        We couldn't reach the server. {pastTimeout ? "It's been a while." : ""}
      </p>
    )
  }
  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <Clock className="h-4 w-4 text-info" aria-hidden />
        Queued — waiting for an available worker.
      </div>
    )
  }
  if (status === "RUNNING") {
    return (
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin text-info" aria-hidden />
        In progress — this can take a few minutes.
      </div>
    )
  }
  if (status === "SUCCESS") {
    return (
      <div className="flex items-center gap-2 text-sm text-success-fg">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Done. Saving your changes…
      </div>
    )
  }
  if (status === "FAILED") {
    return (
      <div className="flex items-start gap-2 text-sm text-danger-fg">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Something went wrong.</p>
          {errorMessage ? (
            <p className="mt-1 text-fg-muted">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    )
  }
  return null
}

/** Re-export for consumers that want to use this from the dialog wrapper. */
export const ASYNC_TRACKER_TIMEOUT_MS = 5 * 60_000
export const ASYNC_TRACKER_AUTO_DISMISS_MS = 4000

export type { ActionStatus }
