import type { LucideIcon } from "lucide-react"
import { Construction } from "lucide-react"
import { Card } from "../ui/Card"

interface PageStubProps {
  title: string
  description?: string
  icon?: LucideIcon
}

/**
 * Phase 1 placeholder. Renders a friendly "coming soon" panel so that the
 * full route table can be mounted in App.tsx before each page is rebuilt in
 * Phase 2 / Phase 4. Replaced by real implementations.
 */
export function PageStub({
  title,
  description = "We're putting the finishing touches on this page. It'll be live very soon.",
  icon: Icon = Construction,
}: PageStubProps) {
  return (
    <div className="mx-auto max-w-xl">
      <Card padding="lg" className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-[1.5rem] font-bold text-fg">{title}</h1>
        <p className="mt-2 text-[0.9375rem] text-fg-muted">{description}</p>
        <p className="mt-6 text-xs text-fg-subtle">
          This is a placeholder while we finish the rebuild. Everything here
          will use real data from your infrastructure.
        </p>
      </Card>
    </div>
  )
}

PageStub.displayName = "PageStub"
