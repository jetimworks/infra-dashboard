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
    // overflow-x-auto (not overflow-hidden) so wide tables become a
    // swipeable strip on mobile instead of silently clipping.
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border-subtle bg-surface",
        className
      )}
    >
      <table className="w-full min-w-full table-auto">{children}</table>
    </div>
  )
}

Table.displayName = "Table"

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-surface-sunken text-left">
      {children}
    </thead>
  )
}

TableHead.displayName = "TableHead"

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border-subtle">{children}</tbody>
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
        "text-sm transition-colors duration-150",
        onClick
          ? "cursor-pointer hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          : "hover:bg-surface-sunken/60",
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
      className={cn("section-label px-3 py-2.5", className)}
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
    <td className={cn("px-3 py-2.5 text-sm text-fg", className)} {...rest}>
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
