import { Link } from "react-router-dom"
import { Compass } from "lucide-react"
import { cn } from "../lib/utils"

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
        <Compass className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-[2rem] font-bold leading-tight text-fg tracking-tight">
        We can't find that page
      </h1>
      <p className="mt-3 text-[0.9375rem] text-fg-muted">
        The page you're looking for has moved, or never existed. Let's get you
        back to somewhere familiar.
      </p>
      <div className="mt-8">
        <Link
          to="/dashboard"
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-[0.9375rem] font-medium text-fg-on-accent shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          )}
        >
          Back to overview
        </Link>
      </div>
    </div>
  )
}
