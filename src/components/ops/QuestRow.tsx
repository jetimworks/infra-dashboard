import { Link } from "react-router-dom"
import { ArrowRight, CircleAlert, Info, TriangleAlert } from "lucide-react"
import type { Quest, QuestSeverity } from "../../lib/quests"
import { cn } from "../../lib/utils"

/**
 * One quest — a live condition the operator can do something about.
 *
 * The row always links somewhere. A quest that cannot be acted on is a
 * complaint, not a task, and the System and Releases pages are where every
 * quest's action lives.
 */

const severityMeta: Record<
  QuestSeverity,
  { icon: typeof CircleAlert; className: string }
> = {
  critical: { icon: CircleAlert, className: "text-danger" },
  warning: { icon: TriangleAlert, className: "text-warning" },
  info: { icon: Info, className: "text-info" },
}

export interface QuestRowProps {
  quest: Quest
  className?: string
}

export function QuestRow({ quest, className }: QuestRowProps) {
  const { icon: Icon, className: toneClass } = severityMeta[quest.severity]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border-b border-l border-border/40 bg-surface/60 p-4",
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{quest.title}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{quest.why}</p>
      </div>
      <Link
        to={quest.actionHref}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
      >
        {quest.cta ?? "Open"}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}
