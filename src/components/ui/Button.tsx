import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { motion, type HTMLMotionProps, useReducedMotion } from "framer-motion"
import { Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { pressTransition } from "../../lib/motion"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "outline-danger"
  | "danger"
  | "success"

export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  fullWidth?: boolean
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-[background-color,color,box-shadow,border-color] duration-200 " +
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
  primary:
    "bg-primary hover:bg-primary-hover shadow-sm hover:shadow-md hover:shadow-primary/20",
  secondary:
    "bg-surface-sunken/80 hover:bg-surface-sunken border border-border/40",
  ghost: "bg-transparent hover:bg-surface-sunken",
  outline:
    "bg-surface/80 border border-border/60 hover:bg-surface-sunken hover:border-border",
  "outline-danger":
    "border border-danger bg-danger/10 hover:bg-danger/20",
  danger:
    "bg-danger border border-danger hover:bg-danger/90 shadow-sm hover:shadow-md hover:shadow-danger/20",
  success:
    "bg-success border border-success hover:bg-success/90 shadow-sm hover:shadow-md hover:shadow-success/20",
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
    const prefersReducedMotion = useReducedMotion()
    return (
      <motion.button
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
        whileTap={
          !prefersReducedMotion && !disabled && !isLoading
            ? { scale: 0.97 }
            : undefined
        }
        transition={pressTransition}
        {...(props as HTMLMotionProps<"button">)}
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
      </motion.button>
    )
  }
)
Button.displayName = "Button"
