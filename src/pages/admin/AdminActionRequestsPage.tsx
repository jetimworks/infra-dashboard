import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Shield,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { useActionRequests, useUpdateActionRequest, useAddActionRequestMessage } from "../../queries/action-requests"
import { Card } from "../../components/ui/Card"
import { AdminTabs } from "../../components/layout/AdminTabs"
import { Button } from "../../components/ui/Button"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { Badge } from "../../components/ui/Badge"
import { Drawer } from "../../components/ui/Drawer"
import { SegmentedControl } from "../../components/ui/SegmentedControl"
import { ActionRequestNoteForm } from "../../components/feedback/ActionRequestNoteForm"
import { formatRelative, formatDate } from "../../lib/utils"
import type { ActionRequest, ActionRequestStatus } from "../../api/types"

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

export function AdminActionRequestsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<ActionRequestStatus | "ALL">("ALL")
  const [selected, setSelected] = useState<ActionRequest | null>(null)

  const actionRequestsQ = useActionRequests()
  const updateMutation = useUpdateActionRequest()
  const addNoteMutation = useAddActionRequestMessage()

  if (actionRequestsQ.isLoading) {
    return <LoadingPage label="Loading action requests…" />
  }

  if (actionRequestsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load action requests"
        error={actionRequestsQ.error as Error}
        onRetry={() => actionRequestsQ.refetch()}
      />
    )
  }

  const allRequests = actionRequestsQ.data?.data ?? []
  const filteredRequests =
    statusFilter === "ALL"
      ? allRequests
      : allRequests.filter((ar) => ar.status === statusFilter)

  const handleStatusChange = async (id: string, newStatus: ActionRequestStatus) => {
    try {
      await updateMutation.mutateAsync({
        id,
        body: { status: newStatus },
      })
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, status: newStatus } : null)
      }
    } catch {
      // Error handled by mutation
    }
  }

  const handleAddNote = async (message: string) => {
    if (!selected) return
    await addNoteMutation.mutateAsync({ id: selected.id, message })
    toast.success("Note added")
  }

  return (
    <div className="space-y-6">
      <AdminTabs />

      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Action Requests
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          All requests from your customers.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL" as const, label: "All" },
            ...statusOrder.map((s) => ({ value: s, label: statusConfig[s].label })),
          ]}
        />
        <span className="text-sm text-fg-muted">
          {filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No action requests"
            description={
              statusFilter === "ALL"
                ? "Customers haven't submitted any requests yet."
                : `No ${statusConfig[statusFilter as ActionRequestStatus].label.toLowerCase()} requests.`
            }
          />
        </Card>
      ) : (
        <Card padding="sm">
          <div className="space-y-1">
            {filteredRequests.map((ar) => {
              const status = statusConfig[ar.status]
              return (
                <button
                  key={ar.id}
                  onClick={() => setSelected(ar)}
                  className="w-full flex items-center justify-between gap-4 px-3 py-3 rounded-md hover:bg-surface-sunken/50 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-fg truncate">{ar.title}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-fg-muted">
                      {ar.project_id ? (
                        <span>Project linked</span>
                      ) : null}
                      {ar.instance_id ? (
                        <span>Instance linked</span>
                      ) : null}
                      <span>{formatRelative(ar.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        description="Review and manage this request."
        widthClass="w-full max-w-lg"
        footer={
          selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label htmlFor="admin-status" className="text-sm font-medium text-fg-muted">
                  Status:
                </label>
                <select
                  id="admin-status"
                  value={selected.status}
                  onChange={(e) =>
                    handleStatusChange(selected.id, e.target.value as ActionRequestStatus)
                  }
                  disabled={updateMutation.isPending}
                  className="rounded-md border border-border/60 bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {statusOrder.map((s) => (
                    <option key={s} value={s}>
                      {statusConfig[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <ActionRequestNoteForm
                onSubmit={handleAddNote}
                isLoading={addNoteMutation.isPending}
                placeholder="Add an admin note..."
              />
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            {/* Status badge and meta */}
            <div className="flex items-center gap-3">
              <Badge tone={statusConfig[selected.status].tone}>
                {statusConfig[selected.status].label}
              </Badge>
              <span className="text-sm text-fg-muted">
                {formatDate(selected.created_at)}
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-fg-muted mb-1.5">Description</h3>
              <p className="text-[0.9375rem] text-fg whitespace-pre-wrap">
                {selected.description}
              </p>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-medium text-fg-muted mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden />
                Notes ({selected.admin_notes.length})
              </h3>
              {selected.admin_notes.length === 0 ? (
                <p className="text-sm text-fg-muted">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {selected.admin_notes.map((note, i) => (
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
            </div>

            {/* Link to full page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/action-requests/${selected.id}`)}
            >
              Open full page
            </Button>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
