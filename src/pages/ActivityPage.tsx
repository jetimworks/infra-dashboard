import { useState, useMemo } from "react"
import { Activity, Search, Filter } from "lucide-react"
import { useProject } from "../contexts/ProjectContext"
import { useInstances } from "../queries/instances"
import { useActions, useInstanceActions } from "../queries/actions"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { Button } from "../components/ui/Button"
import type { ActionStatus } from "../api/types"

type StatusFilter = "all" | "running" | "success" | "failed"

const statusOptions = [
  { value: "all" as const, label: "All" },
  { value: "running" as const, label: "Running" },
  { value: "success" as const, label: "Succeeded" },
  { value: "failed" as const, label: "Failed" },
]

export function ActivityPage() {
  const { selectedProjectId } = useProject()
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  const limit = 25
  const offset = page * limit

  const instancesQ = useInstances(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  )

  // Always call both hooks unconditionally to satisfy React's rules of hooks
  const instanceActionsQ = useInstanceActions(
    selectedInstanceId ?? "",
    {
      limit,
      offset,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter.toUpperCase() as ActionStatus),
    }
  )
  const globalActionsQ = useActions({
    limit,
    offset,
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter.toUpperCase() as ActionStatus),
  })
  // Use the appropriate query based on whether an instance is selected
  const actionsQ = selectedInstanceId ? instanceActionsQ : globalActionsQ

  const all = useMemo(() => actionsQ.data?.data ?? [], [actionsQ.data])
  const total = actionsQ.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const filtered = useMemo(() => {
    if (!search.trim()) return all
    const term = search.toLowerCase()
    return all.filter(
      (a) =>
        a.action_type.toLowerCase().includes(term) ||
        a.instance_id.toLowerCase().includes(term) ||
        (a.error_message ?? "").toLowerCase().includes(term)
    )
  }, [all, search])

  const instances = instancesQ.data ?? []

  if (actionsQ.isLoading) return <LoadingPage label="Loading activity…" />
  if (actionsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load activity"
        error={actionsQ.error as Error}
        onRetry={() => actionsQ.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Activity
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Everything that's happened across your infrastructure, newest first.
        </p>
      </div>

      {/* Instance selector — only enabled once a project is selected */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by instance</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {!selectedProjectId ? (
            <p className="text-sm text-fg-muted">
              Select a project from the top bar to filter by instance.
            </p>
          ) : instancesQ.isLoading ? (
            <p className="text-sm text-fg-muted">Loading instances…</p>
          ) : instances.length === 0 ? (
            <p className="text-sm text-fg-muted">No instances in this project.</p>
          ) : (
            <select
              className="h-9 rounded-md border border-border/60 bg-surface px-3 text-sm text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              value={selectedInstanceId ?? ""}
              onChange={(e) => setSelectedInstanceId(e.target.value || null)}
              aria-label="Select instance"
            >
              <option value="">All instances</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All activity</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Filter className="h-4 w-4" aria-hidden />
            <SegmentedControl
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
          <div className="lg:w-72">
            <Input
              type="search"
              placeholder="Search by type, instance, or error"
              leftIcon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search activity"
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Activity}
            title="No activity to show"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "When backups, security patches, and certificate renewals happen, they'll show up here."
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <ActionTimelineItem key={a.id} action={a} showInstance />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg-muted">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
