import { Award, ListChecks, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card"
import { EmptyState } from "../ui/EmptyState"
import { AchievementBadge } from "./AchievementBadge"
import { OpsScoreCard } from "./OpsScoreCard"
import { QuestRow } from "./QuestRow"
import { earnedAchievementCount } from "../../lib/achievements"
import type { OpsSignals } from "../../queries/ops"

/**
 * The Progress tab.
 *
 * Three things, in the order an operator wants them: how the host is doing
 * (the score), what the operator has done (the badges), and what is waiting
 * to be done (the quests).
 *
 * There is no points total and no streak counter. The level ring absorbs
 * the history, the score describes the host, and the quests describe the
 * work.
 */

export interface InstanceProgressPanelProps {
  signals: OpsSignals
}

export function InstanceProgressPanel({ signals }: InstanceProgressPanelProps) {
  const { score, level, achievements, quests } = signals
  const earned = earnedAchievementCount(achievements)

  return (
    <div className="space-y-6">
      <OpsScoreCard score={score} level={level} />

      <p className="px-1 text-sm text-fg-muted">{level.current.caption}</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" aria-hidden />
            Achievements
          </CardTitle>
          <span className="text-sm text-fg-muted">
            {earned} of {achievements.length} earned
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
          {signals.ledgerTruncated ? (
            <p className="mt-4 text-xs text-fg-subtle">
              Counted from the most recent {signals.ledgerCounted} of{" "}
              {signals.ledgerTotal} recorded operations.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" aria-hidden />
            Quests
          </CardTitle>
          <span className="text-sm text-fg-muted">
            {quests.length === 0
              ? "Nothing waiting"
              : `${quests.length} to look at`}
          </span>
        </CardHeader>
        <CardContent>
          {quests.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              tone="success"
              title="Nothing needs attention"
              description="Every reading on this host is where it should be. New work will show up here as soon as it does."
            />
          ) : (
            <div className="space-y-2.5">
              {quests.map((quest) => (
                <QuestRow key={quest.id} quest={quest} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
