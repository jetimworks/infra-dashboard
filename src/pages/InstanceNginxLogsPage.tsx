import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  Archive,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  Server,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { StatusPill } from "../components/ui/StatusPill"
import { LoadingPage } from "../components/ui/LoadingState"
import { LoadingBlock } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { useNginxLogContent, useNginxLogList, useInstance } from "../queries/instances"
import { useTimeAgo } from "../hooks/useTimeAgo"
import { normalizeError } from "../api/errors"
import { cn, formatBytes } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import type { InstanceType, NginxLogFile } from "../api/types"

const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

const POLL_MS = 5_000
const LINES_OPTIONS = [
  { value: "100", label: "100" },
  { value: "1000", label: "1k" },
  { value: "10000", label: "10k" },
] as const
const LIVE_NAMES = new Set(["access.log", "error.log"])

/**
 * Files currently being appended to by nginx. We show a small live indicator
 * next to these in the list so users know which file is "hot".
 */
function isLive(name: string): boolean {
  return LIVE_NAMES.has(name)
}

export function InstanceNginxLogsPage() {
  const { id } = useParams<{ id: string }>()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  const listQ = useNginxLogList(id)

  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [lines, setLines] = useState(100)
  const [paused, setPaused] = useState(false)
  const [refetchNonce, setRefetchNonce] = useState(0)
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle")
  const [lastRefetchAt, setLastRefetchAt] = useState<number>(() => Date.now())
  const userTouchedRef = useRef(false)

  // Auto-select access.log on first list load. A userTouchedRef prevents the
  // auto-select from kicking in after the user has made their own pick (e.g.
  // after a manual refresh that rotates in new files).
  useEffect(() => {
    const files = listQ.data?.data
    if (!files || files.length === 0) return
    if (selected) return
    if (userTouchedRef.current) return
    const preferred = files.find((f) => f.name === "access.log") ?? files[0]
    setSelected(preferred?.name)
  }, [listQ.data, selected])

  const isGz = selected?.endsWith(".gz") ?? false
  const contentQ = useNginxLogContent(
    isGz ? undefined : id,
    isGz ? undefined : selected,
    lines
  )
  // The hook stays "dumb" — bumping the nonce forces a manual refresh. The
  // timestamp is updated in the click handler that bumps the nonce, so this
  // effect only does the refetch side-effect.
  useEffect(() => {
    if (refetchNonce === 0) return
    contentQ.refetch()
    // contentQ.refetch is a stable reference in TanStack Query v5; we only
    // want to fire when the user hits Refresh or selects a new file (nonce).
  }, [refetchNonce]) // eslint-disable-line react-hooks/exhaustive-deps

  // 5s polling with pause + tab-visibility gating. Clearing on unmount keeps
  // the polling scoped to the page; the tab-visibility guard avoids hammering
  // the API when the user is somewhere else.
  useEffect(() => {
    if (!selected || isGz || paused) return
    const tick = () => {
      if (typeof document === "undefined") return
      if (document.visibilityState === "visible") {
        contentQ.refetch()
        setLastRefetchAt(Date.now())
      }
    }
    const t = setInterval(tick, POLL_MS)
    return () => clearInterval(t)
    // contentQ.refetch is a stable reference in TanStack Query v5; the effect
    // should only re-run when the gate inputs change.
  }, [selected, isGz, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastRefetchAgo = useTimeAgo(
    new Date(lastRefetchAt).toISOString(),
    1_000
  )

  const content = contentQ.data?.content ?? ""
  const truncated = contentQ.data?.truncated ?? false

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopyState("ok")
      setTimeout(() => setCopyState("idle"), 1500)
    } catch {
      setCopyState("fail")
      setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instanceQ.data) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }
  const instance = instanceQ.data
  if (instance.type !== "VPS") {
    return (
      <div className="space-y-6">
        <Breadcrumb id={instance.id} name={instance.name} />
        <Card>
          <EmptyState
            icon={Server}
            title="Nginx logs are only available on servers"
            description={`This is a ${typeLabel[instance.type].toLowerCase()} resource — there's no nginx to inspect.`}
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="enter"
      variants={reduceMotion ? reducedVariants : pageVariants}
    >
      <Breadcrumb id={instance.id} name={instance.name} />

      <header>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          Nginx logs
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Browse the files in{" "}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
            /var/log/nginx/
          </code>{" "}
          and tail the most recent lines. The active log (
          <code className="font-mono">access.log</code>) auto-refreshes while
          this tab is in the foreground.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <FileList
          files={listQ.data?.data ?? []}
          loading={listQ.isLoading}
          error={listQ.isError ? normalizeError(listQ.error) : null}
          selected={selected}
          onSelect={(name) => {
            userTouchedRef.current = true
            setSelected(name)
            setRefetchNonce((n) => n + 1)
            setLastRefetchAt(Date.now())
          }}
          onRefresh={() => listQ.refetch()}
        />
        <Viewer
          filename={selected}
          files={listQ.data?.data ?? []}
          isGz={isGz}
          lines={lines}
          onLinesChange={setLines}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onRefresh={() => {
            setRefetchNonce((n) => n + 1)
            setLastRefetchAt(Date.now())
          }}
          content={content}
          truncated={truncated}
          isLoading={contentQ.isFetching}
          isError={contentQ.isError}
          error={contentQ.isError ? normalizeError(contentQ.error) : null}
          onRetry={() => contentQ.refetch()}
          lastRefetchAgo={lastRefetchAgo}
          copyState={copyState}
          onCopy={handleCopy}
        />
      </div>
    </motion.div>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
      <Link to="/instances" className="hover:text-fg">
        Infrastructure
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <Link to={`/instances/${id}`} className="hover:text-fg">
        {name}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <span className="font-medium text-fg">Nginx logs</span>
    </nav>
  )
}

function FileList({
  files,
  loading,
  error,
  selected,
  onSelect,
  onRefresh,
}: {
  files: NginxLogFile[]
  loading: boolean
  error: { message: string } | null
  selected: string | undefined
  onSelect: (name: string) => void
  onRefresh: () => void
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-fg-muted" aria-hidden />
          <CardTitle>Files</CardTitle>
          {files.length > 0 ? (
            <span className="text-xs text-fg-muted">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={RefreshCw}
          onClick={onRefresh}
          isLoading={loading}
          aria-label="Refresh file list"
        >
          Refresh
        </Button>
      </CardHeader>

      {error ? (
        <div className="px-4 pb-4">
          <ErrorState
            title="Couldn't read log files"
            description={error.message}
            onRetry={onRefresh}
            className="py-6"
          />
        </div>
      ) : files.length === 0 && !loading ? (
        <div className="px-4 pb-4">
          <EmptyState
            icon={FileText}
            tone="info"
            title="No log files"
            description="The /var/log/nginx/ directory is empty on this server."
            className="py-6"
          />
        </div>
      ) : files.length === 0 && loading ? (
        <LoadingBlock label="Loading files…" className="py-6" />
      ) : (
        <ul className="divide-y divide-border/30">
          {files.map((f) => (
            <FileListItem
              key={f.name}
              file={f}
              active={selected === f.name}
              onSelect={() => onSelect(f.name)}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

function FileListItem({
  file,
  active,
  onSelect,
}: {
  file: NginxLogFile
  active: boolean
  onSelect: () => void
}) {
  const live = isLive(file.name)
  const gz = file.name.endsWith(".gz")
  const ago = useTimeAgo(file.modified, 60_000)
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "group flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150",
          active
            ? "bg-primary-soft text-primary"
            : "text-fg hover:bg-surface-sunken"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {active ? (
            <span
              className="inline-block h-4 w-0.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          ) : null}
          {gz ? (
            <Archive
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                active ? "text-primary" : "text-fg-subtle"
              )}
              aria-hidden
            />
          ) : null}
          <span className="truncate font-mono text-[0.8125rem]">{file.name}</span>
          {live ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success-fg"
              title="Live file — currently being written to"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-success-fg animate-pulse"
                aria-hidden
              />
              Live
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
          <span className="tabular-nums">{formatBytes(file.size_bytes)}</span>
          <span aria-hidden>·</span>
          <span>{ago}</span>
        </span>
      </button>
    </li>
  )
}

function Viewer({
  filename,
  files,
  isGz,
  lines,
  onLinesChange,
  paused,
  onTogglePause,
  onRefresh,
  content,
  truncated,
  isLoading,
  isError,
  error,
  onRetry,
  lastRefetchAgo,
  copyState,
  onCopy,
}: {
  filename: string | undefined
  files: NginxLogFile[]
  isGz: boolean
  lines: number
  onLinesChange: (n: number) => void
  paused: boolean
  onTogglePause: () => void
  onRefresh: () => void
  content: string
  truncated: boolean
  isLoading: boolean
  isError: boolean
  error: { message: string } | null
  onRetry: () => void
  lastRefetchAgo: string
  copyState: "idle" | "ok" | "fail"
  onCopy: () => void
}) {
  // Resolve the currently selected file's metadata (if any) so we can show
  // size alongside the line count.
  const currentFile = useMemo(
    () => files.find((f) => f.name === filename) ?? null,
    [files, filename]
  )

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {filename ? (
            <span className="truncate font-mono text-sm text-fg">
              {filename}
            </span>
          ) : (
            <span className="text-sm text-fg-muted">
              Pick a file from the list
            </span>
          )}
          {currentFile ? (
            <StatusPill
              status="neutral"
              size="sm"
              label={formatBytes(currentFile.size_bytes)}
            />
          ) : null}
          {filename && !isGz ? (
            <StatusPill
              status="neutral"
              size="sm"
              label={`${formatNumber(lines)} ${truncated ? "(capped)" : ""} / 10,000 lines`}
            />
          ) : null}
          {truncated ? (
            <StatusPill
              status="warning"
              size="sm"
              label="Truncated — server capped at 10,000 lines"
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filename && !isGz ? (
            <>
              <SegmentedControl
                ariaLabel="Lines to show"
                value={String(lines)}
                onChange={(v) => onLinesChange(Number(v))}
                options={LINES_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
              <Button
                variant="ghost"
                size="sm"
                leftIcon={paused ? Play : Pause}
                onClick={onTogglePause}
                aria-pressed={paused}
              >
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={RefreshCw}
                onClick={onRefresh}
                isLoading={isLoading}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={copyState === "ok" ? Check : Copy}
                onClick={onCopy}
                disabled={!content}
              >
                {copyState === "ok"
                  ? "Copied"
                  : copyState === "fail"
                    ? "Couldn't copy"
                    : "Copy"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="px-4 pt-2 pb-1 text-[11px] text-fg-muted">
        Last refreshed {lastRefetchAgo}
      </div>

      <div className="min-h-[24rem] flex-1 px-4 pb-4 pt-2">
        {!filename ? (
          <EmptyState
            icon={FileText}
            title="Pick a file from the list"
            description="Each row shows the file size and when it was last modified. The active log (access.log) is highlighted."
            className="py-12"
          />
        ) : isGz ? (
          <EmptyState
            icon={Archive}
            tone="warning"
            title="Gzipped — not viewable in v1"
            description="Decompression isn't supported yet. Download the file directly from the server if you need to read a rotated log."
            className="py-12"
          />
        ) : isError ? (
          <ErrorState
            title="Couldn't read the log"
            description={error?.message}
            onRetry={onRetry}
            className="py-8"
          />
        ) : isLoading && !content ? (
          <LoadingBlock label="Loading tail…" className="py-12" />
        ) : content.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="This log is empty"
            description="nginx hasn't written anything here yet."
            className="py-12"
          />
        ) : (
          <pre
            className="max-h-[60vh] overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[11px] leading-relaxed text-fg whitespace-pre-wrap break-words"
            aria-label={`${filename} tail`}
          >
            {content}
          </pre>
        )}
      </div>
    </Card>
  )
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

InstanceNginxLogsPage.displayName = "InstanceNginxLogsPage"
