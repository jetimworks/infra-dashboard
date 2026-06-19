import { type LabelHTMLAttributes } from "react"

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>

export const Label = ({ className, ...props }: LabelProps) => {
  return (
    <label
      className={`text-sm font-medium text-[var(--text-primary)] ${className || ""}`}
      {...props}
    />
  )
}
Label.displayName = "Label"
