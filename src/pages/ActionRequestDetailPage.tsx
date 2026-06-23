import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ChevronRight,
  MessageSquare,
  Shield,
  User,
  Trash2,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { useActionRequest, useDeleteActionRequest, useAddActionRequestMessage } from "../queries/action-requests"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { Badge } from "../components/ui/Badge"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { ActionRequestNoteForm } from "../components/feedback/ActionRequestNoteForm"
import { formatRelative, formatDate } from "../lib/utils"
import type { ActionRequestStatus } from "../api/types"

const statusConfig: Record<
  ActionRequestStatus,
  { tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info"; label: string }
> = {
  OPEN: { tone: "primary", label: "Open" },
  IN_PROGRESS: { tone: "warning", label: "In Progress" },
  RESOLVED: { tone: "success", label: "Resolved" },
  CLOSED: { tone: "neutral", label: "Closed" },
}

export function ActionRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const actionRequestQ = useActionRequest(id)
  const deleteMutation = useDeleteActionRequest()
  const addNoteMutation = useAddActionRequestMessage()

  const [deleteOpen, setDeleteOpen] = useState(false)

  if (actionRequestQ.isLoading) {
    return <LoadingPage label="Loading action request…" />
  }

  if (actionRequestQ.isError) {
    return (
      <ErrorState
        title="We couldn't load this action request"
        error={actionRequestQ.error as Error}
        onRetry={() => actionRequestQ.refetch()}
      />
    )
  }

  if (!actionRequestQ.data) {
    return (
      <ErrorState
        title="Action request not found"
        description="This request may have been deleted."
      />
    )
  }

  const ar = actionRequestQ.data
  const status = statusConfig[ar.status]

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(ar.id)
      navigate("/action-requests")
    } catch {
      // Error handled by mutation
    }
  }

  const handleAddNote = async (message: string) => {
    await addNoteMutation.mutateAsync({ id: ar.id, message })
    toast.success("Note added")
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/action-requests" className="hover:text-fg flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Action Requests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg truncate max-w-[200px]">{ar.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            {ar.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="text-sm text-fg-muted">
              Created {formatRelative(ar.created_at)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="text-danger hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <p className="text-[0.9375rem] text-fg whitespace-pre-wrap">
          {ar.description}
        </p>
      </Card>

      {/* Messages / Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden />
            Notes
          </CardTitle>
        </CardHeader>

        {ar.admin_notes.length === 0 ? (
          <p className="text-sm text-fg-muted px-1">
            No notes yet. Add the first note below.
          </p>
        ) : (
          <div className="space-y-4 mb-5">
            {ar.admin_notes.map((note, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  note.sender_type === "admin" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                    note.sender_type === "admin"
                      ? "bg-primary-soft text-primary"
                      : "bg-surface-sunken text-fg-muted"
                  }`}
                >
                  {note.sender_type === "admin" ? (
                    <Shield className="h-4 w-4" aria-hidden />
                  ) : (
                    <User className="h-4 w-4" aria-hidden />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                    note.sender_type === "admin"
                      ? "bg-primary-soft text-fg"
                      : "bg-surface-sunken text-fg"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {note.sender_type === "admin" ? "Admin" : "You"}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {formatRelative(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <ActionRequestNoteForm
          onSubmit={handleAddNote}
          isLoading={addNoteMutation.isPending}
          placeholder="Add a note or update..."
        />
      </Card>

      {/* Meta */}
      <div className="text-xs text-fg-subtle space-y-1">
        <p>Created {formatDate(ar.created_at)}</p>
        <p>Last updated {formatRelative(ar.updated_at)}</p>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete action request?"
        description="This action cannot be undone. The request and all its notes will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        requireCheckbox
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
