import { type HTMLAttributes } from "react"

export type CardProps = HTMLAttributes<HTMLDivElement>

export const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={`rounded-lg ${className || ""}`}
      {...props}
    />
  )
}
Card.displayName = "Card"
