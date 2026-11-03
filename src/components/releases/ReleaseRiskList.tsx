import { ShieldAlert } from "lucide-react"
import { Badge, type BadgeTone } from "../ui/Badge"
import { cn } from "../../lib/utils"
import type { ReleaseRisk } from "../../api/types"

/**
 * The changes worth a second look before a release goes out.
 *
 * The backend classifies each risk and names the paths it touches. The
 * severity drives the tone, the code is shown verbatim in a chip (it is the
 * machine-readable name an operator will search for), and the affected paths
 * are listed so the risk can be traced to a file.
 */

const SEVERITY_TONE: Record<string, BadgeTone> = {
  high: "danger",
  medium: "warning",
  low: "info",
}

const SEVERITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export interface ReleaseRiskListProps {
  risks: ReleaseRisk[] | null | undefined
  className?: string
  /** Shown when the backend reported no risks at all. */
  emptyMessage?: string
}

export function ReleaseRiskList({
  risks,
  className,
  emptyMessage = "No risks were reported for this comparison.",
}: ReleaseRiskListProps) {
  const items = risks ?? []

  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-fg-muted", className)}>{emptyMessage}</p>
    )
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((risk, index) => {
        const severity = risk.severity?.toLowerCase() ?? ""
        const tone = SEVERITY_TONE[severity] ?? "neutral"
        const paths = risk.paths ?? []

        return (
          <li
            key={`${risk.code}-${index}`}
            className="rounded-md border border-border/40 bg-surface-sunken/50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone}>
                {SEVERITY_LABEL[severity] ?? risk.severity}
              </Badge>
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.75rem] text-fg-muted">
                {risk.code}
              </code>
            </div>
            <p className="mt-2 text-sm text-fg">{risk.message}</p>
            {paths.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {paths.map((path) => (
                  <li
                    key={path}
                    className="break-all rounded bg-surface px-1.5 py-0.5 font-mono text-[0.6875rem] text-fg-subtle"
                  >
                    {path}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

ReleaseRiskList.displayName = "ReleaseRiskList"

/**
 * The headline of a risk section — the count of risks, with the shield icon.
 */
export function ReleaseRiskHeading({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <ShieldAlert
        className={cn(
          "h-4 w-4",
          count > 0 ? "text-warning-fg" : "text-fg-subtle"
        )}
        aria-hidden
      />
      <h4 className="text-sm font-semibold text-fg">
        Risks
        <span className="ml-1.5 font-normal text-fg-muted">
          {count === 1 ? "1 flagged" : `${count} flagged`}
        </span>
      </h4>
    </div>
  )
}
