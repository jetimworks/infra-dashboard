import { useMemo, useState } from "react"
import {
  Database,
  Folder,
  Search,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react"
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

export function InstancesListPage() {
  const [filter, setFilter] = useState<Filter>("ALL")
  const [search, setSearch] = useState("")

  const instancesQ = useInstances(
    filter === "ALL" ? undefined : { type: filter }
  )

  const filtered = useMemo(() => {
    const all = instancesQ.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return all
    return all.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        (i.host ?? "").toLowerCase().includes(term) ||
        (i.domain ?? "").toLowerCase().includes(term)
    )
  }, [instancesQ.data, search])

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
              value={filter}
              onChange={setFilter}
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
                No matches for "{search}".
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
