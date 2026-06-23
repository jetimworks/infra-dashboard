import { Archive, ShieldCheck, RefreshCw, History } from "lucide-react"
import { type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { StatusPill } from "../ui/StatusPill"
import { formatRelative, formatDuration } from "../../lib/utils"
import type { Action } from "../../api/types"

const typeIcon: Record<string, LucideIcon> = {
  BACKUP: Archive,
  SECURITY_PATCH: ShieldCheck,
  SSL_RENEW: RefreshCw,
  RESTORE: Archive,
}

const typeLabel: Record<string, string> = {
  BACKUP: "Backup",
  SECURITY_PATCH: "Security patch",
  SSL_RENEW: "SSL renewal",
  RESTORE: "Restore",
}

export interface ActionTimelineItemProps {
  action: Action
  showInstance?: boolean
}

export function ActionTimelineItem({
  action,
  showInstance,
}: ActionTimelineItemProps) {
  const Icon = typeIcon[action.action_type] ?? History
  const label = typeLabel[action.action_type] ?? action.action_type
  const duration =
    action.completed_at && action.started_at
      ? (new Date(action.completed_at).getTime() -
          new Date(action.started_at).getTime()) /
        1000
      : null

  return (
    <div className="flex items-start gap-3 rounded-md border border-border/40 bg-surface px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-fg-muted">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium text-fg">{label}</p>
          <StatusPill status={action.status} size="sm" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
          <span>{formatRelative(action.started_at)}</span>
          {duration != null ? (
            <>
              <span aria-hidden>·</span>
              <span>Took {formatDuration(duration)}</span>
            </>
          ) : null}
          {showInstance ? (
            <>
              <span aria-hidden>·</span>
              <Link
                to={`/instances/${action.instance_id}`}
                className="text-primary hover:underline"
              >
                View instance
              </Link>
            </>
          ) : null}
        </div>
        {action.error_message ? (
          <p className="mt-1 text-xs text-danger-fg">{action.error_message}</p>
        ) : null}
      </div>
    </div>
  )
}

ActionTimelineItem.displayName = "ActionTimelineItem"
