import { useState } from "react"
import { FolderTree, HardDrive, Search } from "lucide-react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { Input } from "../ui/Input"
import { EmptyState } from "../ui/EmptyState"
import { ErrorState } from "../ui/ErrorState"
import { LoadingBlock } from "../ui/LoadingState"
import { RingGauge } from "../ops/RingGauge"
import { ProgressBar } from "../ops/ProgressBar"
import { diskUsageTone } from "../ops/ring-tone"
import { WarningBlock } from "./WarningBlock"
import { pickPrimaryFilesystem } from "../../lib/ops-host"
import { formatBytes } from "../../lib/utils"
import type { DiskReport, DiskUsage } from "../../api/types"

/**
 * Where the disk space went.
 *
 * The ring is the primary filesystem — the one that takes the host down when
 * it fills. The bars beneath it are every filesystem the host reported, and
 * the directory list is where the space actually sits.
 */

export interface DiskUsagePanelProps {
  report: DiskReport | undefined
  loading: boolean
  error: { message: string } | null
  onRetry: () => void
}

export function DiskUsagePanel({
  report,
  loading,
  error,
  onRetry,
}: DiskUsagePanelProps) {
  const filesystems = report?.filesystems ?? []
  const directories = report?.directories ?? []
  const warnings = report?.warnings ?? []
  const primary = pickPrimaryFilesystem(filesystems)
  const largestDirectory = directories.reduce(
    (largest, dir) => (dir.size_bytes > largest ? dir.size_bytes : largest),
    0
  )

  const [query, setQuery] = useState("")
  const needle = query.trim().toLowerCase()
  const visibleDirectories = needle
    ? directories.filter((dir) => dir.path.toLowerCase().includes(needle))
    : directories

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-fg-muted" aria-hidden />
          <CardTitle>Disk usage</CardTitle>
        </div>
        {report ? (
          <span className="font-mono text-xs text-fg-subtle">{report.path}</span>
        ) : null}
      </CardHeader>

      {error ? (
        <ErrorState
          title="Couldn't read the disk"
          description={error.message}
          onRetry={onRetry}
          className="py-8"
        />
      ) : loading && !report ? (
        <LoadingBlock label="Reading the disk…" className="py-8" />
      ) : filesystems.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No disk report"
          description="The host reported no filesystems, so there is nothing to show yet."
          className="py-8"
        />
      ) : (
        <>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            {primary ? (
              <div className="flex shrink-0 flex-col items-center gap-2">
                <RingGauge
                  value={primary.used_percent}
                  size={140}
                  tone={diskUsageTone(primary.used_percent)}
                  label={`${primary.mount_point || "/"} is ${Math.round(
                    primary.used_percent
                  )} percent full`}
                >
                  <div className="text-center">
                    <span className="block text-[1.5rem] font-bold leading-none tabular-nums text-fg">
                      {Math.round(primary.used_percent)}%
                    </span>
                    <span className="mt-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-fg-subtle">
                      used
                    </span>
                  </div>
                </RingGauge>
                <p className="text-xs text-fg-muted">
                  {primary.mount_point || "/"}
                </p>
              </div>
            ) : null}

            <div className="min-w-0 flex-1 space-y-4">
              {filesystems.map((filesystem) => (
                <FilesystemRow
                  key={`${filesystem.filesystem}-${filesystem.mount_point}`}
                  filesystem={filesystem}
                />
              ))}
            </div>
          </div>

          {directories.length > 0 ? (
            <div className="mt-6 border-t border-border/40 pt-5">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-fg-muted" aria-hidden />
                <h4 className="text-sm font-semibold text-fg">
                  Largest directories
                </h4>
              </div>
              <div className="mt-3">
                <Input
                  type="search"
                  leftIcon={Search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search directories by path"
                  aria-label="Search largest directories"
                />
              </div>
              {needle && visibleDirectories.length === 0 ? (
                <p className="mt-3 text-sm text-fg-muted">
                  No directory matches “{query.trim()}”.
                </p>
              ) : null}
              <div className="mt-3 space-y-3">
                {visibleDirectories.map((directory) => (
                  <DirectoryRow
                    key={directory.path}
                    path={directory.path}
                    sizeBytes={directory.size_bytes}
                    share={
                      largestDirectory > 0
                        ? (directory.size_bytes / largestDirectory) * 100
                        : 0
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          <WarningBlock warnings={warnings} className="mt-5" />
        </>
      )}
    </Card>
  )
}

function FilesystemRow({ filesystem }: { filesystem: DiskUsage }) {
  const used = Math.round(filesystem.used_percent)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-mono text-xs text-fg">
          {filesystem.mount_point || filesystem.filesystem}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-fg-muted">
          {formatBytes(filesystem.available_bytes)} free
        </span>
      </div>
      <ProgressBar
        className="mt-1.5"
        value={filesystem.used_percent}
        tone={diskUsageTone(filesystem.used_percent)}
        label={`${filesystem.mount_point || filesystem.filesystem} is ${used} percent full`}
      />
      <p className="mt-1 text-[0.6875rem] text-fg-subtle">
        {filesystem.filesystem} · {formatBytes(filesystem.used_bytes)} of{" "}
        {formatBytes(filesystem.total_bytes)} used
      </p>
    </div>
  )
}

function DirectoryRow({
  path,
  sizeBytes,
  share,
}: {
  path: string
  sizeBytes: number
  share: number
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-mono text-xs text-fg-muted">{path}</span>
        <span className="shrink-0 text-xs tabular-nums text-fg-muted">
          {formatBytes(sizeBytes)}
        </span>
      </div>
      <ProgressBar
        className="mt-1.5"
        value={share}
        tone="info"
        label={`${path} holds ${formatBytes(sizeBytes)}`}
      />
    </div>
  )
}
