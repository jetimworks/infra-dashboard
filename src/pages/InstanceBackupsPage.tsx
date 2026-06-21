import { Link, useParams } from "react-router-dom"
import { ChevronRight, HardDriveDownload, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useInstance } from "../queries/instances"
import { useBackups, useTriggerBackup, useRestoreBackup } from "../queries/backups"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { BackupItem } from "../components/data/BackupItem"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { AsyncActionTracker } from "../components/feedback/AsyncActionTracker"
import type { BackupListItem, InstanceType } from "../api/types"

export function InstanceBackupsPage() {
  const { id } = useParams<{ id: string }>()
  const instanceQ = useInstance(id)
  const backupsQ = useBackups(id)
  const trigger = useTriggerBackup()
  const restore = useRestoreBackup()

  const [restoreTarget, setRestoreTarget] = useState<BackupListItem | null>(null)
  const [trackingActionId, setTrackingActionId] = useState<string | null>(null)
  const [trackingLabel, setTrackingLabel] = useState("")

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
  const supportsBackups = instance.type === "RDS" || instance.type === "REDIS"
  if (!supportsBackups) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Backups are available for databases and caches. This is a {instance.type} server.
        </p>
        <Link to={`/instances/${instance.id}`} className="text-sm font-medium text-primary hover:underline">
          ← Back to {instance.name}
        </Link>
      </div>
    )
  }

  const backups = backupsQ.data?.data ?? []

  const handleTrigger = () => {
    if (!id) return
    trigger.mutate(id, {
      onSuccess: (data) => {
        setTrackingActionId(data.action_id)
        setTrackingLabel(`Backing up ${instance.name}`)
      },
    })
  }

  const handleConfirmRestore = () => {
    if (!id || !restoreTarget?.filename) return
    restore.mutate(
      { id, filename: restoreTarget.filename },
      {
        onSuccess: (data) => {
          setRestoreTarget(null)
          setTrackingActionId(data.action_id)
          setTrackingLabel(`Restoring from ${restoreTarget.filename}`)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/instances" className="hover:text-fg">
          Infrastructure
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to={`/instances/${instance.id}`} className="hover:text-fg">
          {instance.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">Backups</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Backups
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Every backup we've taken, plus the option to back up right now or
            restore from a previous point.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={Plus}
          onClick={handleTrigger}
          isLoading={trigger.isPending}
        >
          Back up now
        </Button>
      </div>

      {backupsQ.isLoading ? (
        <Card>
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            Loading backups…
          </p>
        </Card>
      ) : backupsQ.isError ? (
        <ErrorState
          title="We couldn't load backups"
          error={backupsQ.error as Error}
          onRetry={() => backupsQ.refetch()}
        />
      ) : backups.length === 0 ? (
        <Card>
          <EmptyState
            icon={HardDriveDownload}
            title="No backups yet"
            description="Tap 'Back up now' to take your first one. We'll keep it safely for you."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <BackupItem
              key={backup.action_id}
              backup={backup}
              instanceType={instance.type as InstanceType}
              onRestore={
                instance.type === "RDS" && backup.status === "SUCCESS"
                  ? () => setRestoreTarget(backup)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleConfirmRestore}
        title={`Restore from ${restoreTarget?.filename ?? "this backup"}?`}
        description="This replaces everything in the database from this point forward with the contents of the backup. This can't be undone."
        confirmLabel="Yes, restore"
        tone="danger"
        requireCheckbox
        checkboxLabel="I understand this will overwrite my current database"
        isLoading={restore.isPending}
      />

      {trackingActionId ? (
        <AsyncActionTracker
          actionId={trackingActionId}
          label={trackingLabel}
          onComplete={() => {
            backupsQ.refetch()
          }}
          onError={() => {
            toast.error("The backup action didn't complete successfully.")
            backupsQ.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
