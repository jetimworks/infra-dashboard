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
  /** Semantic left border in the chosen status color. */
  accent?: CardAccent
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-surface shadow-[var(--shadow-card)] border-b border-l border-border/30",
  raised:
    "bg-surface-raised shadow-[var(--shadow-card-hover)] border-b border-l border-border/30",
  outline: "bg-surface/60 border-b border-l border-border/40",
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
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
          paddingClasses[padding],
          accent && "card-accent",
          accent && `card-accent-${accent}`,
          interactive &&
            !prefersReducedMotion &&
            "cursor-pointer hover:shadow-[var(--shadow-card-hover)]",
          className
        )}
        whileHover={
          interactive && !prefersReducedMotion ? { y: -1.5 } : undefined
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
    className={cn("mb-4 flex items-start justify-between gap-4", className)}
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
    className={cn("text-[1.25rem] font-semibold text-fg", className)}
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
    className={cn("text-sm text-fg-muted mt-1", className)}
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
      "mt-6 flex items-center justify-end gap-3 border-t border-border/50 pt-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
CardFooter.displayName = "CardFooter"
