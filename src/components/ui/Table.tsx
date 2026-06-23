import { type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export function Table({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)]",
        className
      )}
    >
      <table className="w-full">{children}</table>
    </div>
  )
}

Table.displayName = "Table"

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-sunken text-left text-xs uppercase tracking-wide text-fg-muted">
      {children}
    </thead>
  )
}

TableHead.displayName = "TableHead"

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border/50">{children}</tbody>
}

TableBody.displayName = "TableBody"

export function TableRow({
  className,
  children,
  onClick,
}: {
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <tr
      className={cn(
        "text-sm",
        onClick &&
          "cursor-pointer transition-colors hover:bg-surface-sunken",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

TableRow.displayName = "TableRow"

export function TableHeader({
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-4 py-3 font-medium text-fg-muted", className)}
      {...rest}
    >
      {children}
    </th>
  )
}
TableHeader.displayName = "TableHeader"

export function TableCell({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-fg", className)} {...rest}>
      {children}
    </td>
  )
}
TableCell.displayName = "TableCell"

export function TableEmpty({ children }: { children: ReactNode }) {
  return (
    <tr>
      <td
        colSpan={100}
        className="px-4 py-12 text-center text-sm text-fg-muted"
      >
        {children}
      </td>
    </tr>
  )
}
TableEmpty.displayName = "TableEmpty"
