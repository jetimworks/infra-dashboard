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
  "transition-[background-color,color,border-color] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:opacity-50 disabled:pointer-events-none"

/*
  Console buttons sit flat: a border or a fill, never a glow. The old
  `shadow-md hover:shadow-primary/20` treatment made every button on the
  page look like a floating chip.
*/
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-fg-on-accent border border-transparent hover:bg-primary-hover",
  secondary:
    "bg-surface text-fg border border-border hover:bg-surface-sunken",
  ghost:
    "bg-transparent text-fg-muted border border-transparent hover:bg-surface-sunken hover:text-fg",
  outline:
    "bg-surface text-fg border border-border hover:bg-surface-sunken",
  "outline-danger":
    "bg-surface text-danger-fg border border-danger/40 hover:bg-danger/10",
  danger:
    "bg-danger text-fg-on-accent border border-transparent hover:bg-danger/90",
  success:
    "bg-success text-fg-on-accent border border-transparent hover:bg-success/90",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 min-w-9 px-3 text-caption",
  md: "h-10 px-3.5 text-sm",
  lg: "h-11 px-4 text-body",
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
        disabled={disabled || isLoading}
        whileTap={
          !prefersReducedMotion && !disabled && !isLoading
            ? { scale: 0.98 }
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
        {children as ReactNode}
        {!isLoading && RightIcon ? (
          <RightIcon className="h-4 w-4" aria-hidden />
        ) : null}
      </motion.button>
    )
  }
)
Button.displayName = "Button"
