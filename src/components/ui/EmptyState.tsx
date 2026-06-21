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
  className?: string
  children?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
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
        <div className="mb-4 rounded-full bg-surface-sunken p-4">
          <Icon className="h-8 w-8 text-fg-subtle" aria-hidden />
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
