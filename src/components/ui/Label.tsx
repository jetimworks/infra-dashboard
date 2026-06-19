import { type LabelHTMLAttributes } from "react"

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>

export const Label = ({ className, ...props }: LabelProps) => {
  return (
    <label
      className={`text-sm font-medium text-black ${className || ""}`}
      {...props}
    />
  )
}
Label.displayName = "Label"
