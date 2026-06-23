import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Database,
  Folder,
  Search,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useProject } from "../contexts/ProjectContext"
import { useInstances } from "../queries/instances"
import { Card } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { LoadingPage } from "../components/ui/LoadingState"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorState } from "../components/ui/ErrorState"
import { InstanceCard } from "../components/data/InstanceCard"
import type { InstanceType } from "../api/types"

type Filter = "ALL" | InstanceType

const filterOptions: { value: Filter; label: string; icon?: LucideIcon }[] = [
  { value: "ALL", label: "All" },
  { value: "VPS", label: "Servers", icon: Server },
  { value: "RDS", label: "Databases", icon: Database },
  { value: "REDIS", label: "Caches", icon: Zap },
  { value: "STORAGE", label: "Storage", icon: Folder },
]

const validFilters: Filter[] = ["ALL", "VPS", "RDS", "REDIS", "STORAGE"]

export function InstancesListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>("ALL")
  const [search, setSearch] = useState("")

  const projectIdFromUrl = searchParams.get("project_id") ?? searchParams.get("projectId")
  const { selectedProjectId } = useProject()
  const effectiveProjectId = projectIdFromUrl ?? selectedProjectId ?? undefined

  // Derive filter from URL directly — don't try to sync state during render
  const typeParam = searchParams.get("type")
  const filterFromUrl: Filter =
    typeParam && validFilters.includes(typeParam as Filter)
      ? (typeParam as Filter)
      : "ALL"

  // Use URL filter when available, otherwise use state
  const activeFilter = searchParams.has("type") ? filterFromUrl : filter

  // When project changes, clear URL type param so filter falls back to "ALL"
  useEffect(() => {
    if (searchParams.has("type")) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete("type")
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProjectId])

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter)
    const newParams = new URLSearchParams(searchParams)
    if (newFilter === "ALL") {
      newParams.delete("type")
    } else {
      newParams.set("type", newFilter)
    }
    setSearchParams(newParams, { replace: true })
  }

  // Always fetch ALL instances (no type filter) so counts stay stable
  const instancesQ = useInstances({
    ...(effectiveProjectId && { projectId: effectiveProjectId }),
  })

  // Filter client-side based on active filter and search
  const filtered = useMemo(() => {
    const all = instancesQ.data ?? []
    const term = search.trim().toLowerCase()
    return all.filter((i) => {
      const matchesType = activeFilter === "ALL" || i.type === activeFilter
      const matchesSearch =
        !term ||
        i.name.toLowerCase().includes(term) ||
        (i.host ?? "").toLowerCase().includes(term) ||
        (i.domain ?? "").toLowerCase().includes(term)
      return matchesType && matchesSearch
    })
  }, [instancesQ.data, activeFilter, search])

  if (instancesQ.isLoading) return <LoadingPage label="Loading your infrastructure…" />
  if (instancesQ.isError) {
    return (
      <ErrorState
        title="We couldn't load your servers"
        error={instancesQ.error as Error}
        onRetry={() => instancesQ.refetch()}
      />
    )
  }

  const all = instancesQ.data ?? []
  const counts: Record<Filter, number> = {
    ALL: all.length,
    VPS: all.filter((i) => i.type === "VPS").length,
    RDS: all.filter((i) => i.type === "RDS").length,
    REDIS: all.filter((i) => i.type === "REDIS").length,
    STORAGE: all.filter((i) => i.type === "STORAGE").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Your infrastructure
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Every server, database, and storage bucket in one place. Tap any
          card to see live health.
        </p>
      </div>

      {all.length === 0 ? (
        <Card>
          <EmptyState
            icon={Server}
            title="No resources yet"
            description="Once we set up your first server, database, or storage, it'll show up here."
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              ariaLabel="Filter by type"
              value={activeFilter}
              onChange={handleFilterChange}
              options={filterOptions.map((o) => ({
                ...o,
                label: `${o.label} · ${counts[o.value]}`,
              }))}
            />
            <div className="lg:w-72">
              <Input
                type="search"
                placeholder="Search by name, host, or domain"
                leftIcon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search instances"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                {search
                  ? `No matches for "${search}".`
                  : activeFilter === "ALL"
                    ? "No resources yet."
                    : `No ${activeFilter === "VPS" ? "servers" : activeFilter === "RDS" ? "databases" : activeFilter === "REDIS" ? "caches" : "storage"} in this project.`}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((instance) => (
                <InstanceCard key={instance.id} instance={instance} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
