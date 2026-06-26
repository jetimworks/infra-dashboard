import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "outline-danger"
  | "danger"
  | "success"

export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  fullWidth?: boolean
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:opacity-50 disabled:pointer-events-none"

const variantTextColor: Record<ButtonVariant, string> = {
  primary: "var(--fg-on-accent)",
  secondary: "var(--fg)",
  ghost: "var(--fg-muted)",
  outline: "var(--fg)",
  "outline-danger": "var(--danger-fg)",
  danger: "var(--fg)",
  success: "#ffffff",
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface-sunken/80 hover:bg-surface-sunken",
  ghost: "bg-transparent hover:bg-surface-sunken",
  outline: "bg-surface/80 border border-border/60 hover:bg-surface-sunken",
  "outline-danger": "border border-danger bg-danger/10 hover:bg-danger/20",
  danger: "bg-danger border border-danger hover:bg-danger/90 shadow-sm",
  success: "hover:bg-success/90 shadow-sm",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[0.9375rem]",
  lg: "h-12 px-5 text-[1.0625rem]",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        style={{ color: variantTextColor[variant], ...props.style }}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : LeftIcon ? (
          <LeftIcon className="h-4 w-4" aria-hidden />
        ) : null}
        <span style={{ color: variantTextColor[variant] }}>{children as ReactNode}</span>
        {!isLoading && RightIcon ? (
          <RightIcon className="h-4 w-4" aria-hidden />
        ) : null}
      </button>
    )
  }
)
Button.displayName = "Button"
