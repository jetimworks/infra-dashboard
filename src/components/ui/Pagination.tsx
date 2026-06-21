import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./Button"

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null
  const prev = () => onChange(Math.max(1, page - 1))
  const next = () => onChange(Math.min(totalPages, page + 1))
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm text-fg-muted",
        className
      )}
    >
      <p>
        Page <span className="font-medium text-fg">{page}</span> of{" "}
        <span className="font-medium text-fg">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={prev}
          disabled={page <= 1}
          leftIcon={ChevronLeft}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={next}
          disabled={page >= totalPages}
          rightIcon={ChevronRight}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
Pagination.displayName = "Pagination"
