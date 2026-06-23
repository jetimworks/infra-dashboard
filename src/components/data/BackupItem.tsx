import { ArchiveRestore, Download } from "lucide-react"
import { Button } from "../ui/Button"
import { StatusPill } from "../ui/StatusPill"
import { formatBytes, formatRelative, formatDuration } from "../../lib/utils"
import type { BackupListItem, InstanceType } from "../../api/types"

export interface BackupItemProps {
  backup: BackupListItem
  instanceType: InstanceType
  onRestore?: () => void
  onDownload?: () => void
}

export function BackupItem({
  backup,
  instanceType,
  onRestore,
  onDownload,
}: BackupItemProps) {
  const duration =
    backup.completed_at && backup.started_at
      ? (new Date(backup.completed_at).getTime() -
          new Date(backup.started_at).getTime()) /
        1000
      : null
  const isRds = instanceType === "RDS"
  const canRestore = isRds && backup.status === "SUCCESS" && !!onRestore

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/40 bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm text-fg">
            {backup.filename ?? "—"}
          </p>
          <StatusPill status={backup.status} size="sm" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
          <span>{formatRelative(backup.started_at)}</span>
          {duration != null ? (
            <>
              <span aria-hidden>·</span>
              <span>Took {formatDuration(duration)}</span>
            </>
          ) : null}
          {backup.size_bytes != null ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatBytes(backup.size_bytes)}</span>
            </>
          ) : null}
        </div>
        {backup.error_message ? (
          <p className="mt-1 text-xs text-danger-fg">{backup.error_message}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {onDownload ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            leftIcon={Download}
          >
            Download
          </Button>
        ) : null}
        {canRestore ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRestore}
            leftIcon={ArchiveRestore}
          >
            Restore
          </Button>
        ) : null}
      </div>
    </div>
  )
}

BackupItem.displayName = "BackupItem"
