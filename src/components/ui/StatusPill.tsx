import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react"
import { cn } from "../../lib/utils"
import type { BadgeTone } from "./Badge"

export type StatusPillStatus =
  | "ok"
  | "safe"
  | "healthy"
  | "success"
  | "active"
  | "running"
  | "warning"
  | "needs_attention"
  | "pending"
  | "queued"
  | "failed"
  | "danger"
  | "action_required"
  | "inactive"
  | "stopped"
  | "deactivated"
  | "verified"
  | string

export interface StatusPillProps {
  status: StatusPillStatus
  label?: string
  size?: "sm" | "md"
  className?: string
}

const statusMap: Record<
  string,
  { tone: BadgeTone; icon: typeof CheckCircle2; defaultLabel: string }
> = {
  ok: { tone: "success", icon: CheckCircle2, defaultLabel: "OK" },
  safe: { tone: "success", icon: CheckCircle2, defaultLabel: "Safe" },
  healthy: { tone: "success", icon: CheckCircle2, defaultLabel: "Healthy" },
  success: { tone: "success", icon: CheckCircle2, defaultLabel: "Succeeded" },
  active: { tone: "success", icon: CheckCircle2, defaultLabel: "Active" },
  verified: { tone: "success", icon: CheckCircle2, defaultLabel: "Verified" },
  running: { tone: "info", icon: Loader2, defaultLabel: "Running" },
  pending: { tone: "info", icon: Clock, defaultLabel: "Pending" },
  queued: { tone: "info", icon: Clock, defaultLabel: "Queued" },
  warning: { tone: "warning", icon: AlertTriangle, defaultLabel: "Warning" },
  needs_attention: {
    tone: "warning",
    icon: AlertTriangle,
    defaultLabel: "Needs attention",
  },
  failed: { tone: "danger", icon: XCircle, defaultLabel: "Failed" },
  danger: { tone: "danger", icon: AlertOctagon, defaultLabel: "Action needed" },
  action_required: {
    tone: "danger",
    icon: AlertOctagon,
    defaultLabel: "Action needed",
  },
  inactive: { tone: "neutral", icon: MinusCircle, defaultLabel: "Inactive" },
  stopped: { tone: "neutral", icon: MinusCircle, defaultLabel: "Stopped" },
  deactivated: { tone: "neutral", icon: MinusCircle, defaultLabel: "Deactivated" },
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-fg-muted ring-1 ring-inset ring-border/40",
  primary: "bg-primary-soft text-primary-soft-fg ring-1 ring-inset ring-primary/15",
  success: "bg-success-soft text-success-fg ring-1 ring-inset ring-success/20",
  warning: "bg-warning-soft text-warning-fg ring-1 ring-inset ring-warning/25",
  danger: "bg-danger-soft text-danger-fg ring-1 ring-inset ring-danger/20",
  info: "bg-info-soft text-info-fg ring-1 ring-inset ring-info/20",
}

export function StatusPill({
  status,
  label,
  size = "md",
  className,
}: StatusPillProps) {
  const mapping = statusMap[status] ?? {
    tone: "neutral" as const,
    icon: MinusCircle,
    defaultLabel: status,
  }
  const Icon = mapping.icon
  const text = label ?? mapping.defaultLabel
  const isRunning = status === "running"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-200",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        toneClasses[mapping.tone],
        className
      )}
    >
      <Icon
        className={cn(
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          isRunning && "animate-spin"
        )}
        aria-hidden
      />
      {text}
    </span>
  )
}
