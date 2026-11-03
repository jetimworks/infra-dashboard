import {
  Award,
  HardDriveDownload,
  History,
  Layers,
  Rocket,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react"
import type { Achievement } from "../../lib/achievements"
import { formatDate } from "../../lib/utils"
import { cn } from "../../lib/utils"

/**
 * One badge.
 *
 * An earned badge says WHEN it was earned — the timestamp of the ledger row
 * that satisfied the rule. A locked badge says the rule and how far along
 * the operator is, so the badge teaches the system instead of just sitting
 * there greyed out.
 */

const icons: Record<string, LucideIcon> = {
  first_deploy: Rocket,
  rollback_rescue: RotateCcw,
  service_whisperer: Settings2,
  swap_guardian: Layers,
  backup_keeper: HardDriveDownload,
  restore_captain: History,
  steady_hand: Target,
  clean_record: ShieldCheck,
  trusted_operator: Award,
}

export interface AchievementBadgeProps {
  achievement: Achievement
  className?: string
}

export function AchievementBadge({
  achievement,
  className,
}: AchievementBadgeProps) {
  const Icon = icons[achievement.id] ?? Award

  return (
    <div
      className={cn(
        "rounded-lg border-b border-l p-4",
        achievement.earned
          ? "border-border/30 bg-surface shadow-[var(--shadow-card)]"
          : "border-border/40 bg-surface/60",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            achievement.earned
              ? "bg-accent-soft text-accent-soft-fg"
              : "bg-surface-sunken text-fg-subtle"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              achievement.earned ? "text-fg" : "text-fg-muted"
            )}
          >
            {achievement.name}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {achievement.description}
          </p>
          {achievement.earned ? (
            <p className="mt-2 text-xs text-fg-subtle">
              Earned {formatDate(achievement.earnedAt)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-fg-subtle">
              {achievement.rule} · {achievement.progress}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
