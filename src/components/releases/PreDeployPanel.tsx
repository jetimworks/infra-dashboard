import { useState } from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileDiff,
  GitBranch,
  GitCommitHorizontal,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { Badge, type BadgeTone } from "../ui/Badge"
import { Button } from "../ui/Button"
import { LoadingBlock } from "../ui/LoadingState"
import { WarningBlock } from "../system/WarningBlock"
import { cn, formatRelative } from "../../lib/utils"
import type { ApiError } from "../../api/errors"
import type { PreDeployFile, PreDeployReport } from "../../api/types"
import { preDeployVerdict, type PreDeployVerdict } from "../../lib/pre-deploy"

const statusStyle: Record<string, { tone: BadgeTone; label: string }> = {
  A: { tone: "success", label: "Added" },
  M: { tone: "info", label: "Modified" },
  D: { tone: "danger", label: "Deleted" },
  R: { tone: "primary", label: "Renamed" },
  C: { tone: "primary", label: "Copied" },
  T: { tone: "warning", label: "Type changed" },
}

export interface PreDeployPanelProps {
  report: PreDeployReport | undefined
  loading: boolean
  error: ApiError | Error | null
  onRetry: () => void
  /** The branch the operator asked about — shown when the report is missing. */
  branch: string
}

export function PreDeployPanel({
  report,
  loading,
  error,
  onRetry,
  branch,
}: PreDeployPanelProps) {
  if (loading && !report) {
    return (
      <div className="space-y-3 py-2">
        <LoadingBlock label={`Fetching origin for ${branch}…`} className="py-6" />
      </div>
    )
  }

  if (error) {
    const notDeployed = (error as ApiError).status === 404
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25"
      >
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger-fg">
            {notDeployed
              ? "Pre-deploy check isn't available yet"
              : "Couldn't check what's pending"}
          </p>
          <p className="mt-1 text-sm text-fg">
            {notDeployed
              ? "This backend doesn't have the pre-deploy check yet. You can still deploy, but you won't see the changes first."
              : `The server's state is unknown, so this is not an empty result. ${error.message}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            leftIcon={RefreshCw}
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!report) return null

  const verdict = preDeployVerdict(report, null)
  const dirty = report.dirty ?? []
  const files = report.files ?? []
  const commits = report.commits ?? []
  const warnings = report.warnings ?? []
  const detached = report.head_branch === "HEAD"
  const onOtherBranch =
    !detached && report.head_branch !== "" && report.head_branch !== report.branch

  return (
    <div className={cn("space-y-5 transition-opacity", loading && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <GitBranch className="h-4 w-4" aria-hidden />
          <span>Checking</span>
          <Badge tone="primary">
            <span className="font-mono">{report.remote_branch}</span>
          </Badge>
          {loading ? <span className="text-xs text-fg-subtle">Refreshing…</span> : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={RefreshCw}
          onClick={onRetry}
          disabled={loading}
        >
          Re-check
        </Button>
      </div>

      <VerdictBanner verdict={verdict} report={report} />

      {warnings.length > 0 ? (
        <WarningBlock warnings={warnings} title="Heads up" />
      ) : null}

      {dirty.length > 0 ? (
        <div className="rounded-md bg-warning-soft p-4 ring-1 ring-inset ring-warning/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-fg" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-warning-fg">
                Uncommitted changes on the server
              </p>
              <p className="mt-1 text-sm text-fg">
                The deploy will refuse to run until these are cleared.
              </p>
              <ul className="mt-3 space-y-1 font-mono text-xs text-fg">
                {dirty.map((line) => (
                  <li key={line} className="break-all rounded bg-surface/60 px-2 py-1">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {onOtherBranch || detached ? (
        <p className="text-sm text-warning-fg">
          {detached
            ? "The server is on a detached HEAD, not a branch."
            : <>The server has <span className="font-mono">{report.head_branch}</span> checked out, not <span className="font-mono">{report.branch}</span>.</>}{" "}
          A deploy switches it to <span className="font-mono">{report.branch}</span>.
        </p>
      ) : null}

      {verdict !== "upToDate" && verdict !== "unknown" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CommitList commits={commits} total={report.commit_count} />
          <FileList files={files} total={report.files_changed} />
        </div>
      ) : null}
    </div>
  )
}

function VerdictBanner({
  verdict,
  report,
}: {
  verdict: PreDeployVerdict
  report: PreDeployReport
}) {
  if (verdict === "upToDate") {
    return (
      <Banner
        tone="success"
        Icon={CheckCircle2}
        title="Already up to date"
        body={
          <>
            <span className="font-mono">{report.branch}</span> on the server matches{" "}
            <span className="font-mono">{report.remote_branch}</span>. Nothing new to deploy.
          </>
        }
      />
    )
  }
  if (verdict === "blocked") {
    return (
      <Banner
        tone="warning"
        Icon={AlertTriangle}
        title="Blocked by uncommitted changes"
        body="Clear the changes listed below, then re-check."
      />
    )
  }
  return (
    <Banner
      tone="info"
      Icon={GitCommitHorizontal}
      title={`${report.commit_count} commit${report.commit_count === 1 ? "" : "s"} and ${report.files_changed} file${report.files_changed === 1 ? "" : " files"} will be deployed`}
      body={
        <>
          From <span className="font-mono">{report.branch}</span>{" "}
          {report.local_sha ? <code className="font-mono text-xs">{report.local_sha.slice(0, 7)}</code> : null}
          {" "}to <span className="font-mono">{report.remote_branch}</span>{" "}
          {report.remote_sha ? <code className="font-mono text-xs">{report.remote_sha.slice(0, 7)}</code> : null}
        </>
      }
    />
  )
}

const bannerTone = {
  success: { wrap: "bg-success-soft ring-success/25 text-success-fg", icon: "text-success-fg" },
  warning: { wrap: "bg-warning-soft ring-warning/30 text-warning-fg", icon: "text-warning-fg" },
  info: { wrap: "bg-info-soft ring-info/25 text-info-fg", icon: "text-info-fg" },
} as const

function Banner({
  tone,
  Icon,
  title,
  body,
}: {
  tone: keyof typeof bannerTone
  Icon: typeof CheckCircle2
  title: string
  body: React.ReactNode
}) {
  const t = bannerTone[tone]
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-start gap-3 rounded-md p-4 ring-1 ring-inset", t.wrap)}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-fg">{body}</p>
      </div>
    </div>
  )
}

const PREVIEW_LIMIT = 5

function CommitList({
  commits,
  total,
}: {
  commits: PreDeployReport["commits"]
  total: number
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? commits : commits.slice(0, PREVIEW_LIMIT)
  const hidden = commits.length - shown.length

  return (
    <section className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        <GitCommitHorizontal className="h-4 w-4" aria-hidden />
        Commits to deploy
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-soft-fg tabular-nums">
          {total}
        </span>
      </h3>

      {commits.length === 0 ? (
        <p className="rounded-md bg-surface-sunken/60 px-3 py-4 text-sm text-fg-muted">
          No new commits.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 rounded-md border border-border/50">
          {shown.map((c) => (
            <li key={c.sha} className="flex flex-col gap-1 px-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm font-medium text-fg hover:text-primary hover:underline"
                  >
                    {c.subject}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {c.subject}
                  </span>
                )}
                <CopySha sha={c.short_sha} />
              </div>
              <p className="text-xs text-fg-subtle">
                {c.author} · {formatRelative(c.date)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {commits.length > PREVIEW_LIMIT ? (
        <ToggleMore
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          hidden={hidden}
          noun="commits"
        />
      ) : null}
    </section>
  )
}

function FileList({ files, total }: { files: PreDeployFile[]; total: number }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? files : files.slice(0, PREVIEW_LIMIT)
  const hidden = files.length - shown.length

  return (
    <section className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        <FileDiff className="h-4 w-4" aria-hidden />
        Files that will change
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-soft-fg tabular-nums">
          {total}
        </span>
      </h3>

      {files.length === 0 ? (
        <p className="rounded-md bg-surface-sunken/60 px-3 py-4 text-sm text-fg-muted">
          No file changes.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 rounded-md border border-border/50">
          {shown.map((f) => {
            const style = statusStyle[f.status] ?? { tone: "neutral" as BadgeTone, label: f.status }
            const isRename = (f.status === "R" || f.status === "C") && f.old_path
            return (
              <li key={`${f.status}-${f.old_path}-${f.path}`} className="flex items-center gap-2 px-3 py-2">
                <Badge tone={style.tone} className="w-7 justify-center font-mono" title={style.label}>
                  {f.status}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg">
                  {isRename ? (
                    <>
                      <span className="text-fg-subtle line-through">{f.old_path}</span>
                      <span className="mx-1.5 text-fg-subtle">→</span>
                      {f.path}
                    </>
                  ) : (
                    f.path
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {files.length > PREVIEW_LIMIT ? (
        <ToggleMore
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          hidden={hidden}
          noun="files"
        />
      ) : null}
    </section>
  )
}

function ToggleMore({
  expanded,
  onToggle,
  hidden,
  noun,
}: {
  expanded: boolean
  onToggle: () => void
  hidden: number
  noun: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <ChevronDown
        className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
        aria-hidden
      />
      {expanded ? `Show fewer ${noun}` : `Show ${hidden} more ${noun}`}
    </button>
  )
}

function CopySha({ sha }: { sha: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sha)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (insecure context) — the SHA stays selectable.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy commit SHA"
      aria-label={`Copy commit ${sha}`}
      className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success-fg" aria-hidden />
      ) : (
        <Copy className="h-3 w-3" aria-hidden />
      )}
      {sha}
    </button>
  )
}
