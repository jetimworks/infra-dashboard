import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronRight,
  ClipboardList,
} from "lucide-react"
import { useAdminActionRequests } from "../../queries/action-requests"
import { Card } from "../../components/ui/Card"
import { AdminTabs } from "../../components/layout/AdminTabs"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { Badge } from "../../components/ui/Badge"
import { SegmentedControl } from "../../components/ui/SegmentedControl"
import { formatRelative } from "../../lib/utils"
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

export function AdminActionRequestsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<ActionRequestStatus | "ALL">("ALL")

  const actionRequestsQ = useAdminActionRequests()

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
                  onClick={() => navigate(`/admin/action-requests/${ar.id}`)}
                  className="w-full flex items-center justify-between gap-4 px-3 py-3 rounded-md hover:bg-surface-sunken/50 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-fg truncate">{ar.title}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-fg-muted">
                      {ar.project ? (
                        <span>{ar.project.name}</span>
                      ) : null}
                      {ar.instance ? (
                        <span>{ar.instance.name}</span>
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
    </div>
  )
}
