import { type LabelHTMLAttributes, type ReactNode } from "react"
import { cn } from "../../lib/utils"

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  children: ReactNode
}

export const Label = ({
  className,
  required,
  children,
  ...props
}: LabelProps) => {
  return (
    <label
      className={cn(
        "text-[0.8125rem] font-medium text-fg-muted inline-flex items-center gap-1",
        className
      )}
      {...props}
    >
      {children}
      {required ? <span className="text-danger">*</span> : null}
    </label>
  )
}
Label.displayName = "Label"
