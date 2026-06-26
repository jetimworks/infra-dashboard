import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button, type ButtonVariant } from "./Button"

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: ButtonVariant
    icon?: LucideIcon
  }
  /** Tints the icon background. Defaults to "info" (soft blue). */
  tone?: "info" | "primary" | "accent" | "success" | "warning" | "danger"
  className?: string
  children?: ReactNode
}

const toneClasses: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  info: "bg-info-soft text-info-fg",
  primary: "bg-primary-soft text-primary-soft-fg",
  accent: "bg-accent-soft text-accent-soft-fg",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  danger: "bg-danger-soft text-danger-fg",
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "info",
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12",
        className
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "mb-4 flex h-16 w-16 items-center justify-center rounded-full animate-float",
            toneClasses[tone]
          )}
        >
          <Icon className="h-8 w-8" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-[1.25rem] font-semibold text-fg">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-[0.9375rem] text-fg-muted">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-6">
          <Button
            variant={action.variant ?? "primary"}
            onClick={action.onClick}
            leftIcon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
EmptyState.displayName = "EmptyState"
