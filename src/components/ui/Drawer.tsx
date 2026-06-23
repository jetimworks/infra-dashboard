import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./Button"

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  side?: "right" | "left"
  widthClass?: string
  footer?: ReactNode
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  widthClass = "w-full max-w-xl",
  footer,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && dlg.backdrop) {
      dlg.backdrop.style.backgroundColor = "rgba(0, 0, 0, 1)"
    }
  }, [open])

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
        "m-0 ml-auto h-screen max-h-screen",
        side === "right" ? "ml-auto" : "mr-auto",
        widthClass,
        "p-0 shadow-[var(--shadow-modal)] animate-fade-in"
      )}
      style={{ backgroundColor: "#ffffff" }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-4">
          <div>
            <h2 className="text-[1.25rem] font-semibold text-fg">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-fg-muted">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-border/50 px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </dialog>
  )
}
Drawer.displayName = "Drawer"
