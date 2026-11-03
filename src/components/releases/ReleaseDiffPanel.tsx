import { FileDiff, GitCommitHorizontal } from "lucide-react"
import { LoadingBlock } from "../ui/LoadingState"
import { ErrorState } from "../ui/ErrorState"
import { EmptyState } from "../ui/EmptyState"
import { WarningBlock } from "../system/WarningBlock"
import { ReleaseRiskList, ReleaseRiskHeading } from "./ReleaseRiskList"
import { cn, formatDate } from "../../lib/utils"
import type { ReleaseDiff } from "../../api/types"

/**
 * "What would change if I deployed this commit?"
 *
 * The comparison the backend computes between two commits: how many commits
 * are in between, how many lines they add and remove, what the working tree
 * looks like, and which changes it flagged as risky.
 *
 * The insertions/deletions bar is proportional — a commit that adds 900
 * lines and removes 3 looks like what it is, rather than two equal halves.
 */

export interface ReleaseDiffPanelProps {
  diff: ReleaseDiff | null | undefined
  loading: boolean
  error: { message: string } | null
  onRetry: () => void
  className?: string
}

export function ReleaseDiffPanel({
  diff,
  loading,
  error,
  onRetry,
  className,
}: ReleaseDiffPanelProps) {
  if (error) {
    return (
      <ErrorState
        title="Couldn't read the comparison"
        description={error.message}
        onRetry={onRetry}
        className="py-8"
      />
    )
  }

  if (loading && !diff) {
    return <LoadingBlock label="Comparing the commits…" className="py-8" />
  }

  if (!diff) {
    return (
      <EmptyState
        icon={FileDiff}
        title="No comparison yet"
        description="Enter a commit to see what would change before it is deployed."
        className="py-8"
      />
    )
  }

  const commits = diff.commits ?? []
  const risks = diff.risks ?? []
  const warnings = diff.warnings ?? []
  const dirtyEntries = diff.dirty_entries ?? []
  const total = diff.insertions + diff.deletions
  const insertionWidth = total > 0 ? (diff.insertions / total) * 100 : 0
  const deletionWidth = total > 0 ? (diff.deletions / total) * 100 : 0

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ShaPair label="From" sha={diff.from} />
        <ShaPair label="To" sha={diff.to} />
        {diff.resolved_sha && diff.resolved_sha !== diff.to ? (
          <ShaPair label="Resolved" sha={diff.resolved_sha} />
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Stat label="Commits" value={String(diff.commit_count)} />
        <Stat label="Files changed" value={String(diff.files_changed)} />
        <Stat
          label="Insertions"
          value={`+${diff.insertions}`}
          tone="success"
        />
        <Stat label="Deletions" value={`−${diff.deletions}`} tone="danger" />
      </dl>

      <div>
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
          role="img"
          aria-label={`${diff.insertions} insertions and ${diff.deletions} deletions`}
        >
          {insertionWidth > 0 ? (
            <div
              className="h-full bg-success"
              style={{ width: `${insertionWidth}%` }}
            />
          ) : null}
          {deletionWidth > 0 ? (
            <div
              className="h-full bg-danger"
              style={{ width: `${deletionWidth}%` }}
            />
          ) : null}
        </div>
      </div>

      {diff.dirty ? (
        <div className="rounded-md bg-warning-soft p-4 text-warning-fg ring-1 ring-inset ring-warning/25">
          <p className="text-sm font-semibold">The working tree is dirty</p>
          <p className="mt-1 text-sm">
            There are uncommitted changes on the server. A release deploys the
            commit, not the working tree — those changes would be left behind.
          </p>
          {dirtyEntries.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {dirtyEntries.map((entry) => (
                <li
                  key={entry}
                  className="break-all font-mono text-[0.75rem]"
                >
                  {entry}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <WarningBlock warnings={warnings} />

      <div>
        <div className="flex items-center gap-2">
          <GitCommitHorizontal className="h-4 w-4 text-fg-subtle" aria-hidden />
          <h4 className="text-sm font-semibold text-fg">
            Commits
            <span className="ml-1.5 font-normal text-fg-muted">
              {commits.length === 1 ? "1 commit" : `${commits.length} commits`}
            </span>
          </h4>
        </div>

        {commits.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">
            No commits between these two revisions.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {commits.map((commit) => (
              <li
                key={commit.sha}
                className="rounded-md border border-border/40 bg-surface-sunken/50 p-3"
              >
                <p className="text-sm text-fg">{commit.subject}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono">
                    {commit.sha.slice(0, 8)}
                  </code>
                  <span>{commit.author}</span>
                  <span>{formatDate(commit.date)}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <ReleaseRiskHeading count={risks.length} />
        <ReleaseRiskList risks={risks} className="mt-3" />
      </div>
    </div>
  )
}

ReleaseDiffPanel.displayName = "ReleaseDiffPanel"

function ShaPair({ label, sha }: { label: string; sha: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.75rem] text-fg">
        {sha ? sha.slice(0, 8) : "—"}
      </code>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "danger"
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-medium tabular-nums",
          tone === "success"
            ? "text-success-fg"
            : tone === "danger"
              ? "text-danger-fg"
              : "text-fg"
        )}
      >
        {value}
      </dd>
    </div>
  )
}
