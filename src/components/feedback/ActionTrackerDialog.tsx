import { useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import { AsyncActionTracker } from "./AsyncActionTracker"

export interface ActionTrackerDialogProps {
  open: boolean
  onClose: () => void
  actionId: string | null
  label: string
  onComplete?: () => void
  onError?: () => void
}

/**
 * Wraps AsyncActionTracker in a native <dialog>. Used by backup trigger,
 * restore, SSL renewal, and system action. Backdrop click does not dismiss
 * while the action is still pending so users don't accidentally lose track
 * of running work.
 */
export function ActionTrackerDialog({
  open,
  onClose,
  actionId,
  label,
  onComplete,
  onError,
}: ActionTrackerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && actionId && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open, actionId])

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    const handler = () => onClose()
    dlg.addEventListener("close", handler)
    return () => dlg.removeEventListener("close", handler)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "w-full max-w-lg rounded-xl bg-transparent p-0 backdrop:bg-fg/40 animate-scale-in"
      )}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      {actionId ? (
        <AsyncActionTracker
          actionId={actionId}
          label={label}
          onStop={onClose}
          onComplete={onComplete}
          onError={onError}
        />
      ) : null}
    </dialog>
  )
}

ActionTrackerDialog.displayName = "ActionTrackerDialog"
