import { Archive, Rocket, ShieldCheck, RefreshCw, History } from "lucide-react"
import { type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { StatusPill } from "../ui/StatusPill"
import { formatRelative, formatDuration } from "../../lib/utils"
import { listItem } from "../../lib/motion"
import type { Action } from "../../api/types"

const typeIcon: Record<string, LucideIcon> = {
  BACKUP: Archive,
  SECURITY_PATCH: ShieldCheck,
  SSL_RENEW: RefreshCw,
  RESTORE: Archive,
  DEPLOY_APP: Rocket,
}

const typeLabel: Record<string, string> = {
  BACKUP: "Backup",
  SECURITY_PATCH: "Security patch",
  SSL_RENEW: "SSL renewal",
  RESTORE: "Restore",
  DEPLOY_APP: "App deploy",
}

const typeAccent: Record<string, string> = {
  BACKUP: "bg-primary-soft text-primary",
  SECURITY_PATCH: "bg-success-soft text-success-fg",
  SSL_RENEW: "bg-info-soft text-info-fg",
  RESTORE: "bg-accent-soft text-accent-soft-fg",
  DEPLOY_APP: "bg-accent-soft text-accent-soft-fg",
}

export interface ActionTimelineItemProps {
  action: Action
  showInstance?: boolean
  /**
   * Render the script output from `action.metadata.output` as a small
   * monospace block below the row. Off by default so the global /activity
   * feed and the per-instance Activity tab stay compact; the deploy page
   * opts in because operators want to glance at the stdout of the last
   * few runs without opening the result panel.
   */
  showOutput?: boolean
}

export function ActionTimelineItem({
  action,
  showInstance,
  showOutput,
}: ActionTimelineItemProps) {
  const Icon = typeIcon[action.action_type] ?? History
  const label = typeLabel[action.action_type] ?? action.action_type
  const accentClass = typeAccent[action.action_type] ?? "bg-surface-sunken text-fg-muted"
  const duration =
    action.completed_at && action.started_at
      ? (new Date(action.completed_at).getTime() -
          new Date(action.started_at).getTime()) /
        1000
      : null
  // `metadata` is a free-form record; only `output` is rendered inline.
  // Treat anything non-string as missing so we don't render "[object Object]".
  const metadataOutput =
    typeof action.metadata?.output === "string" &&
    action.metadata.output.length > 0
      ? action.metadata.output
      : null

  return (
    <motion.div
      variants={listItem}
      className="flex items-start gap-3 rounded-md border border-border/40 bg-surface px-4 py-3 transition-colors duration-200 hover:border-primary/30"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accentClass}`}
      >
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
        {showOutput && metadataOutput ? (
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-surface-sunken px-2 py-1.5 font-mono text-[11px] leading-snug text-fg-muted whitespace-pre-wrap break-words">
            {metadataOutput}
          </pre>
        ) : null}
      </div>
    </motion.div>
  )
}

ActionTimelineItem.displayName = "ActionTimelineItem"
