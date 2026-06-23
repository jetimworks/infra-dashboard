import { useState } from "react"
import { Plus } from "lucide-react"
import { useActionRequests } from "../queries/action-requests"
import { useProject } from "../contexts/ProjectContext"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { ActionRequestCard } from "../components/data/ActionRequestCard"
import { ActionRequestCreateDialog } from "../components/feedback/ActionRequestCreateDialog"
import { ClipboardList } from "lucide-react"

export function ActionRequestsPage() {
  const { selectedProjectId } = useProject()
  const [createOpen, setCreateOpen] = useState(false)
  const actionRequestsQ = useActionRequests({ projectId: selectedProjectId ?? undefined })

  if (actionRequestsQ.isLoading) {
    return <LoadingPage label="Loading action requests…" />
  }

  if (actionRequestsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load your action requests"
        error={actionRequestsQ.error as Error}
        onRetry={() => actionRequestsQ.refetch()}
      />
    )
  }

  const actionRequests = actionRequestsQ.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Action Requests
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Track and manage your requests to the team.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => setCreateOpen(true)}
        >
          New Request
        </Button>
      </div>

      {actionRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No action requests yet"
            description="When you need something from the team — more resources, a service restart, or anything else — create a request here."
            action={{
              label: "Create your first request",
              onClick: () => setCreateOpen(true),
              variant: "primary",
              icon: Plus,
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {actionRequests.map((ar) => (
            <ActionRequestCard key={ar.id} actionRequest={ar} />
          ))}
        </div>
      )}

      <ActionRequestCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId ?? undefined}
      />
    </div>
  )
}
