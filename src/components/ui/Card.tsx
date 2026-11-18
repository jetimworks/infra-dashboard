import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { motion, type HTMLMotionProps, useReducedMotion } from "framer-motion"
import { cn } from "../../lib/utils"
import { cardHoverTransition } from "../../lib/motion"

export type CardVariant = "default" | "raised" | "outline"
export type CardPadding = "none" | "sm" | "md" | "lg"
export type CardAccent = "info" | "success" | "warning" | "danger" | "primary" | "accent"

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "ref"> {
  variant?: CardVariant
  padding?: CardPadding
  interactive?: boolean
  /**
   * Tints the card in a status colour. This is a tonal surface with a
   * matching hairline — deliberately not a coloured side stripe, which
   * reads as decoration rather than meaning.
   */
  accent?: CardAccent
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface border border-border-subtle",
  raised: "bg-surface-raised border border-border-subtle shadow-[var(--shadow-card)]",
  outline: "bg-surface border border-border",
}

const accentClasses: Record<CardAccent, string> = {
  info: "border-info/35 bg-info-soft/40",
  success: "border-success/35 bg-success-soft/40",
  warning: "border-warning/40 bg-warning-soft/50",
  danger: "border-danger/35 bg-danger-soft/40",
  primary: "border-primary/35 bg-primary-soft/40",
  accent: "border-accent/35 bg-accent-soft/40",
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      padding = "md",
      interactive,
      accent,
      children,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion()
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg",
          variantClasses[variant],
          accent && accentClasses[accent],
          paddingClasses[padding],
          interactive &&
            !prefersReducedMotion &&
            "cursor-pointer transition-colors hover:border-border hover:bg-surface-sunken/40",
          className
        )}
        whileHover={
          interactive && !prefersReducedMotion ? { y: -1 } : undefined
        }
        transition={cardHoverTransition}
        {...(props as HTMLMotionProps<"div">)}
      >
        {children}
      </motion.div>
    )
  }
)
Card.displayName = "Card"

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const CardHeader = ({ className, children, ...props }: CardHeaderProps) => (
  <div
    className={cn("mb-3 flex items-start justify-between gap-4", className)}
    {...props}
  >
    {children}
  </div>
)
CardHeader.displayName = "CardHeader"

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

export const CardTitle = ({ className, children, ...props }: CardTitleProps) => (
  <h3
    className={cn(
      "font-display text-lead font-semibold leading-tight text-fg",
      className
    )}
    {...props}
  >
    {children}
  </h3>
)
CardTitle.displayName = "CardTitle"

export interface CardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

export const CardDescription = ({
  className,
  children,
  ...props
}: CardDescriptionProps) => (
  <p
    className={cn("text-caption leading-relaxed text-fg-muted", className)}
    {...props}
  >
    {children}
  </p>
)
CardDescription.displayName = "CardDescription"

export const CardContent = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("text-fg", className)} {...props}>
    {children}
  </div>
)
CardContent.displayName = "CardContent"

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const CardFooter = ({
  className,
  children,
  ...props
}: CardFooterProps) => (
  <div
    className={cn(
      "mt-4 flex items-center justify-end gap-3 border-t border-border-subtle pt-3",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
CardFooter.displayName = "CardFooter"
