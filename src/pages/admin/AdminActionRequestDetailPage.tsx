import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  User,
  Server,
  FolderOpen,
  MessageSquare,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { useAdminActionRequest, useUpdateActionRequest, useAddActionRequestMessage } from "../../queries/action-requests"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { Badge } from "../../components/ui/Badge"
import { ActionRequestNoteForm } from "../../components/feedback/ActionRequestNoteForm"
import { formatRelative, formatDate } from "../../lib/utils"
import type { ActionRequestStatus } from "../../api/types"

const statusConfig: Record<
  ActionRequestStatus,
  { tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info"; label: string }
> = {
  OPEN: { tone: "primary", label: "Open" },
  IN_PROGRESS: { tone: "warning", label: "In Progress" },
  RESOLVED: { tone: "success", label: "Resolved" },
  CLOSED: { tone: "neutral", label: "Closed" },
}

const statusOrder: ActionRequestStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]

export function AdminActionRequestDetailPage() {
  const { id } = useParams<{ id: string }>()

  const actionRequestQ = useAdminActionRequest(id)
  const updateMutation = useUpdateActionRequest()
  const addNoteMutation = useAddActionRequestMessage()

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

  const handleStatusChange = async (newStatus: ActionRequestStatus) => {
    try {
      await updateMutation.mutateAsync({
        id: ar.id,
        body: { status: newStatus },
      })
      actionRequestQ.refetch()
    } catch {
      // Error handled by mutation
    }
  }

  const handleAddNote = async (message: string) => {
    await addNoteMutation.mutateAsync({ id: ar.id, message })
    toast.success("Note added")
    actionRequestQ.refetch()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/admin/action-requests" className="hover:text-fg flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Action Requests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg truncate max-w-[300px]">{ar.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight">
                    {ar.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <span className="text-sm text-fg-muted">
                      Created {formatRelative(ar.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-fg-muted mb-2">Description</h3>
                <p className="text-[0.9375rem] text-fg whitespace-pre-wrap leading-relaxed">
                  {ar.description}
                </p>
              </div>

              {/* Status Control */}
              <div className="mt-6 pt-6 border-t border-border/40">
                <div className="flex items-center gap-3">
                  <label htmlFor="admin-status" className="text-sm font-medium text-fg-muted">
                    Update Status:
                  </label>
                  <select
                    id="admin-status"
                    value={ar.status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as ActionRequestStatus)
                    }
                    disabled={updateMutation.isPending}
                    className="rounded-md border border-border/60 bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {statusOrder.map((s) => (
                      <option key={s} value={s}>
                        {statusConfig[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden />
                Notes ({ar.admin_notes.length})
              </CardTitle>
            </CardHeader>

            {ar.admin_notes.length === 0 ? (
              <p className="text-sm text-fg-muted px-1 pb-4">
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
                          {note.sender_type === "admin" ? "Admin" : "User"}
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

            <div className="px-1 pb-1">
              <ActionRequestNoteForm
                onSubmit={handleAddNote}
                isLoading={addNoteMutation.isPending}
                placeholder="Add an admin note..."
              />
            </div>
          </Card>

          {/* Meta */}
          <div className="text-xs text-fg-subtle space-y-1 px-1">
            <p>Created {formatDate(ar.created_at)}</p>
            <p>Last updated {formatRelative(ar.updated_at)}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" aria-hidden />
                Requested By
              </CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <Link
                to={`/admin/users?search=${ar.user.email}`}
                className="flex items-start gap-3 group"
              >
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-medium text-sm">
                  {ar.user.first_name?.[0]}{ar.user.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg group-hover:text-primary transition-colors">
                    {ar.user.first_name} {ar.user.last_name}
                  </p>
                  <p className="text-sm text-fg-muted truncate">{ar.user.email}</p>
                  {ar.user.phone && (
                    <p className="text-xs text-fg-subtle mt-0.5">{ar.user.phone}</p>
                  )}
                </div>
              </Link>
              <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Status</span>
                  <Badge tone={ar.user.status === "active" ? "success" : "neutral"}>
                    {ar.user.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Verified</span>
                  <span className="text-fg">{ar.user.is_verified ? "Yes" : "No"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Member since</span>
                  <span className="text-fg">{formatRelative(ar.user.created_at)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Project Card */}
          {ar.project && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4" aria-hidden />
                  Project
                </CardTitle>
              </CardHeader>
              <div className="px-5 pb-5">
                <Link
                  to={`/admin/projects?search=${ar.project.id}`}
                  className="block group"
                >
                  <p className="font-medium text-fg group-hover:text-primary transition-colors">
                    {ar.project.name}
                  </p>
                  {ar.project.description && (
                    <p className="text-sm text-fg-muted mt-1 line-clamp-2">
                      {ar.project.description}
                    </p>
                  )}
                </Link>
                <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">Type</span>
                    <span className="text-fg">{ar.project.instance_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">RAM</span>
                    <span className="text-fg">{ar.project.total_allocated_ram}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">Storage</span>
                    <span className="text-fg">{ar.project.total_storage_capacity}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">Database</span>
                    <span className="text-fg">
                      {ar.project.database_driver || "—"} {ar.project.database_version || ""}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Instance Card */}
          {ar.instance && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Server className="h-4 w-4" aria-hidden />
                  Instance
                </CardTitle>
              </CardHeader>
              <div className="px-5 pb-5">
                <Link
                  to={`/admin/instances?search=${ar.instance.id}`}
                  className="block group"
                >
                  <p className="font-medium text-fg group-hover:text-primary transition-colors">
                    {ar.instance.name}
                  </p>
                  <p className="text-sm text-fg-muted mt-0.5">
                    {ar.instance.host && `${ar.instance.host}:${ar.instance.port}`}
                    {ar.instance.domain && ` (${ar.instance.domain})`}
                  </p>
                </Link>
                <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">Type</span>
                    <Badge tone="neutral">{ar.instance.type}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">Status</span>
                    <Badge tone={ar.instance.is_active ? "success" : "neutral"}>
                      {ar.instance.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {ar.instance.username && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-fg-muted">User</span>
                      <span className="text-fg">{ar.instance.username}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
