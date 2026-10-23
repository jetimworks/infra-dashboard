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
import {
  INSTANCE_BUCKETS,
  bucketForType,
  instanceMatchesBucket,
  isInstanceType,
  type InstanceBucket,
} from "../lib/instance-types"

// The chip is a bucket, not a raw type, so "Databases" can show RDS and
// REMOTE_RDS together — see lib/instance-types.ts for why they share one.
type Filter = "ALL" | InstanceBucket

const filterOptions: { value: Filter; label: string; icon?: LucideIcon }[] = [
  { value: "ALL", label: "All" },
  { value: "SERVERS", label: "Servers", icon: Server },
  { value: "DATABASES", label: "Databases", icon: Database },
  { value: "CACHES", label: "Caches", icon: Zap },
  { value: "STORAGE", label: "Storage", icon: Folder },
]

/**
 * ?type= accepts either a bucket ("DATABASES") or a raw instance type
 * ("RDS", "REMOTE_RDS"). The raw form still works because the param has
 * always carried the API's type value, and a link like ?type=REMOTE_RDS
 * should land on Databases rather than silently fall back to All.
 */
function filterFromTypeParam(param: string): Filter {
  const asBucket = INSTANCE_BUCKETS.find((b) => b.value === param)
  if (asBucket) return asBucket.value
  if (isInstanceType(param)) return bucketForType(param)
  return "ALL"
}

export function InstancesListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>("ALL")
  const [search, setSearch] = useState("")

  const projectIdFromUrl = searchParams.get("project_id") ?? searchParams.get("projectId")
  const { selectedProjectId } = useProject()
  const effectiveProjectId = projectIdFromUrl ?? selectedProjectId ?? undefined

  // Derive filter from URL directly — don't try to sync state during render
  const typeParam = searchParams.get("type")
  const filterFromUrl: Filter = typeParam ? filterFromTypeParam(typeParam) : "ALL"

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
      const matchesType =
        activeFilter === "ALL" || instanceMatchesBucket(i.type, activeFilter)
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
    SERVERS: all.filter((i) => instanceMatchesBucket(i.type, "SERVERS")).length,
    DATABASES: all.filter((i) => instanceMatchesBucket(i.type, "DATABASES")).length,
    CACHES: all.filter((i) => instanceMatchesBucket(i.type, "CACHES")).length,
    STORAGE: all.filter((i) => instanceMatchesBucket(i.type, "STORAGE")).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
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
            {/* Scrollable gutter keeps the type filter swipeable on
                narrow phones while letting it sit inline on wider
                viewports. */}
            <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
              <SegmentedControl
                ariaLabel="Filter by type"
                value={activeFilter}
                onChange={handleFilterChange}
                options={filterOptions.map((o) => ({
                  ...o,
                  label: `${o.label} · ${counts[o.value]}`,
                }))}
              />
            </div>
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
                    : // Derived from the chip's own label rather than a chain of
                      // comparisons: the old ternary had no arm for a new
                      // bucket and fell through to "storage", which is how a
                      // silently-wrong empty state happens.
                      `No ${INSTANCE_BUCKETS.find((b) => b.value === activeFilter)?.label.toLowerCase() ?? "resources"} in this project.`}
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
