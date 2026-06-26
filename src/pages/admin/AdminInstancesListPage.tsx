import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChevronRight,
  Database,
  Folder,
  Plus,
  Search,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useAdminInstances, useAdminProjects } from "../../queries/admin"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { SegmentedControl } from "../../components/ui/SegmentedControl"
import { StatusPill } from "../../components/ui/StatusPill"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { formatRelative } from "../../lib/utils"
import type { InstanceType } from "../../api/types"

type Filter = "ALL" | InstanceType

const typeIcon: Record<InstanceType, LucideIcon> = {
  VPS: Server,
  RDS: Database,
  REDIS: Zap,
  STORAGE: Folder,
}
const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

const filterOptions: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "VPS", label: "Servers" },
  { value: "RDS", label: "Databases" },
  { value: "REDIS", label: "Caches" },
  { value: "STORAGE", label: "Storage" },
]

export function AdminInstancesListPage() {
  const [filter, setFilter] = useState<Filter>("ALL")
  const [search, setSearch] = useState("")
  const instancesQ = useAdminInstances()
  const projectsQ = useAdminProjects()

  const instances = useMemo(() => {
    const all = instancesQ.data ?? []
    const filtered = filter === "ALL" ? all : all.filter((i) => i.type === filter)
    if (!search.trim()) return filtered
    const term = search.toLowerCase()
    return filtered.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        (i.host ?? "").toLowerCase().includes(term)
    )
  }, [instancesQ.data, search, filter])

  if (instancesQ.isLoading) return <LoadingPage label="Loading instances…" />
  if (instancesQ.isError) {
    return (
      <ErrorState
        title="We couldn't load instances"
        error={instancesQ.error as Error}
        onRetry={() => instancesQ.refetch()}
      />
    )
  }

  const all = instancesQ.data ?? []
  const projectMap = new Map(
    (projectsQ.data ?? []).map((p) => [p.id, p.name])
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Instances
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Every server, database, and storage bucket on the platform.
          </p>
        </div>
        <Link
          to="/admin/instances/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-[0.9375rem] font-medium text-fg-on-accent shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add instance
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          ariaLabel="Filter by type"
          value={filter}
          onChange={setFilter}
          options={filterOptions}
        />
        <div className="lg:w-72">
          <Input
            type="search"
            placeholder="Search by name or host"
            leftIcon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search instances"
          />
        </div>
      </div>

      {instances.length === 0 ? (
        <Card>
          <EmptyState
            icon={Server}
            title="No instances match"
            description={search ? `Nothing matches "${search}".` : "No instances of this type yet."}
          />
        </Card>
      ) : (
        <Card padding="sm">
          <CardHeader className="px-3">
            <CardTitle>
              {instances.length} instance{instances.length === 1 ? "" : "s"}
              {" "}· {all.length} total
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border-subtle">
            {instances.map((instance) => {
              const Icon = typeIcon[instance.type]
              const projectName = projectMap.get(instance.project_id)
              return (
                <li key={instance.id} className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Link
                          to={`/admin/instances/${instance.id}/edit`}
                          className="text-sm font-semibold text-fg hover:underline"
                        >
                          {instance.name}
                        </Link>
                        <span className="text-xs text-fg-muted">
                          {typeLabel[instance.type]}
                        </span>
                        <StatusPill
                          status={instance.is_active ? "active" : "inactive"}
                          size="sm"
                        />
                        {instance.is_local ? (
                          <span className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-fg-muted">
                            local
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {projectName ? `${projectName} · ` : ""}
                        {instance.host ?? "—"}
                        {instance.domain ? ` · ${instance.domain}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-fg-muted">
                      Updated {formatRelative(instance.updated_at)}
                    </p>
                    <Link
                      to={`/admin/instances/${instance.id}/edit`}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
                    >
                      Edit
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
