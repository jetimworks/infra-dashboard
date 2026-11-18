import { type HTMLAttributes, type ReactNode } from "react"
import { cn } from "../../lib/utils"

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-fg-muted ring-border",
  primary: "bg-primary-soft text-primary-soft-fg ring-primary/20",
  success: "bg-success-soft text-success-fg ring-success/20",
  warning: "bg-warning-soft text-warning-fg ring-warning/25",
  danger: "bg-danger-soft text-danger-fg ring-danger/20",
  info: "bg-info-soft text-info-fg ring-info/20",
}

export const Badge = ({
  className,
  tone = "neutral",
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-medium ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
Badge.displayName = "Badge"
