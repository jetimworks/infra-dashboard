import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { useAdminActions } from "../../queries/admin"
import { Card } from "../../components/ui/Card"
import { SegmentedControl } from "../../components/ui/SegmentedControl"
import { StatusPill } from "../../components/ui/StatusPill"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { formatRelative } from "../../lib/utils"
import type { ActionStatus } from "../../api/types"

const actionTypeIcon: Record<string, typeof RefreshCw> = {
  BACKUP: HardDrive,
  SECURITY_PATCH: ShieldCheck,
  SSL_RENEW: ShieldCheck,
  RESTORE: RefreshCw,
}

const actionTypeLabel: Record<string, string> = {
  BACKUP: "Backup",
  SECURITY_PATCH: "Security patch",
  SSL_RENEW: "SSL renew",
  RESTORE: "Restore",
}

const statusConfig: Record<ActionStatus, { tone: "neutral" | "success" | "warning" | "danger"; label: string }> = {
  PENDING: { tone: "neutral", label: "Pending" },
  RUNNING: { tone: "warning", label: "Running" },
  SUCCESS: { tone: "success", label: "Success" },
  FAILED: { tone: "danger", label: "Failed" },
}

const statusOptions: { value: ActionStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "RUNNING", label: "Running" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILED", label: "Failed" },
]

export function AdminActivityPage() {
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "ALL">("ALL")

  const actionsQ = useAdminActions({ limit: 100 })

  if (actionsQ.isLoading) return <LoadingPage label="Loading activity…" />
  if (actionsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load activity"
        error={actionsQ.error as Error}
        onRetry={() => actionsQ.refetch()}
      />
    )
  }

  const allActions = actionsQ.data?.data ?? []

  const filteredActions =
    statusFilter === "ALL"
      ? allActions
      : allActions.filter((a) => a.status === statusFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Activity
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Platform-wide action feed — all background jobs across every instance.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
        />
        <span className="text-sm text-fg-muted">
          {filteredActions.length} action{filteredActions.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredActions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description={
              statusFilter === "ALL"
                ? "No background jobs have run yet."
                : `No ${statusConfig[statusFilter as ActionStatus].label.toLowerCase()} actions.`
            }
          />
        </Card>
      ) : (
        <Card padding="sm">
          <ul className="divide-y divide-border-subtle">
            {filteredActions.map((action) => {
              const Icon = actionTypeIcon[action.action_type] ?? RefreshCw
              const status = statusConfig[action.status]
              const label = actionTypeLabel[action.action_type] ?? action.action_type
              return (
                <li key={action.id} className="flex items-center gap-3 py-3 px-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                      action.status === "FAILED"
                        ? "bg-danger-soft text-danger-fg"
                        : action.status === "SUCCESS"
                        ? "bg-success-soft text-success-fg"
                        : action.status === "RUNNING"
                        ? "bg-warning-soft text-warning-fg"
                        : "bg-surface-sunken text-fg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-fg">{label}</span>
                      <StatusPill status={status.tone === "success" ? "active" : status.tone === "danger" ? "failed" : status.tone === "warning" ? "running" : "pending"} size="sm" />
                    </div>
                    <p className="text-xs text-fg-muted">
                      {action.instance_id ? (
                        <Link
                          to={`/admin/instances/${action.instance_id}/edit`}
                          className="text-primary hover:underline"
                        >
                          {action.instance_id.slice(0, 8)}…
                        </Link>
                      ) : null}
                      {" · "}
                      {formatRelative(action.started_at)}
                      {action.completed_at
                        ? ` · completed ${formatRelative(action.completed_at)}`
                        : ""}
                    </p>
                  </div>
                  {action.error_message ? (
                    <div className="flex items-center gap-1 text-xs text-danger-fg">
                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                      <span className="max-w-[200px] truncate">{action.error_message}</span>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
