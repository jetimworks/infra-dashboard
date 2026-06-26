import { useState } from "react"
import { Copy, Check, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"
import { listItem } from "../../lib/motion"
import type { SecurityFinding } from "../../api/types"

const statusIcon = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  action_required: AlertOctagon,
} as const

const statusClass = {
  ok: "text-success-fg bg-success-soft",
  warning: "text-warning-fg bg-warning-soft",
  action_required: "text-danger-fg bg-danger-soft",
} as const

const statusAccent = {
  ok: "success",
  warning: "warning",
  action_required: "danger",
} as const

const statusLabel = {
  ok: "OK",
  warning: "Look at this",
  action_required: "Action needed",
} as const

export interface SecurityFindingItemProps {
  finding: SecurityFinding
  /** Optional action button rendered inside the card (e.g. for action_required findings) */
  actionButton?: React.ReactNode
}

export function SecurityFindingItem({ finding, actionButton }: SecurityFindingItemProps) {
  const Icon = statusIcon[finding.status]
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!finding.action) return
    navigator.clipboard.writeText(finding.action).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <motion.div
      variants={listItem}
      className={cn(
        "card-accent card-accent-" + statusAccent[finding.status],
        "rounded-lg bg-surface p-4 shadow-[var(--shadow-card)] border-b border-l border-border/40 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            statusClass[finding.status]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 className="text-[1rem] font-semibold text-fg">{finding.title}</h4>
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide",
                statusClass[finding.status]
              )}
            >
              {statusLabel[finding.status]}
            </span>
          </div>
          {finding.detail ? (
            <p className="mt-1 text-sm text-fg-muted">{finding.detail}</p>
          ) : null}
          {finding.action ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-fg-muted">
                What to do
              </p>
              <div className="flex items-center gap-2 rounded-md border border-border/40 bg-surface-sunken px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg">
                  {finding.action}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  aria-label="Copy command"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          ) : null}
          {actionButton && (
            <div className="mt-3">{actionButton}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

SecurityFindingItem.displayName = "SecurityFindingItem"
