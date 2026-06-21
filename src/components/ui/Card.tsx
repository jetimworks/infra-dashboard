import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cn } from "../../lib/utils"

export type CardVariant = "default" | "raised" | "outline"
export type CardPadding = "none" | "sm" | "md" | "lg"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  interactive?: boolean
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-surface border border-border shadow-[var(--shadow-card)]",
  raised:
    "bg-surface-raised border border-border-subtle shadow-[var(--shadow-card)]",
  outline: "bg-transparent border border-border",
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
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg",
          variantClasses[variant],
          paddingClasses[padding],
          interactive &&
            "transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
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

export const CardFooter = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
CardFooter.displayName = "CardFooter"
