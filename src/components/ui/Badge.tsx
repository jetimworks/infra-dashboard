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
  neutral: "bg-surface-sunken text-fg-muted",
  primary: "bg-primary-soft text-primary-soft-fg",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  danger: "bg-danger-soft text-danger-fg",
  info: "bg-info-soft text-info-fg",
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
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.75rem] font-medium",
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
