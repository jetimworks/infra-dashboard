import { useEffect, useRef, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "./Button"

export type ConfirmDialogTone = "default" | "danger"

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmDialogTone
  requireCheckbox?: boolean
  checkboxLabel?: string
  isLoading?: boolean
  onConfirm: () => void
}

/**
 * Accessible modal dialog used to confirm any non-trivial action. The native
 * <dialog> element is used so we get focus trapping, ESC handling, and
 * backdrop styling for free. For destructive ops, tone="danger" colors the
 * confirm button red and requireCheckbox forces the user to type-check an
 * "I understand" box before the confirm button enables.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  requireCheckbox = false,
  checkboxLabel = "I understand this cannot be undone",
  isLoading,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) {
      dlg.showModal()
      setChecked(false)
    } else if (!open && dlg.open) {
      dlg.close()
    }
  }, [open])

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    const handler = () => onClose()
    dlg.addEventListener("close", handler)
    return () => dlg.removeEventListener("close", handler)
  }, [onClose])

  const handleConfirm = () => {
    if (requireCheckbox && !checked) return
    onConfirm()
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-xl bg-surface p-0 shadow-[var(--shadow-modal)] backdrop:bg-fg/40 animate-scale-in"
      onClick={(e) => {
        // Click on backdrop (outside the dialog box) closes it.
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {tone === "danger" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
              <AlertTriangle className="h-5 w-5 text-danger-fg" aria-hidden />
            </div>
          ) : null}
          <div className="flex-1">
            <h2 className="text-[1.25rem] font-semibold text-fg">{title}</h2>
            <p className="mt-2 text-[0.9375rem] text-fg-muted">{description}</p>
          </div>
        </div>

        {requireCheckbox ? (
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-surface-sunken p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-danger focus:ring-danger"
            />
            <span className="text-sm text-fg">{checkboxLabel}</span>
          </label>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={requireCheckbox && !checked}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

ConfirmDialog.displayName = "ConfirmDialog"
