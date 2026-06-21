import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Cloud,
  Database,
  Folder,
  Server,
  Users,
  Zap,
} from "lucide-react"
import { useProjects } from "../../queries/projects"
import { useInstances } from "../../queries/instances"
import { useActions } from "../../queries/actions"
import { useAdminUsers } from "../../queries/admin"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { StatusPill } from "../../components/ui/StatusPill"
import { formatRelative } from "../../lib/utils"
import type { InstanceType } from "../../api/types"

export function AdminOverviewPage() {
  const usersQ = useAdminUsers()
  const projectsQ = useProjects()
  const instancesQ = useInstances()
  const actionsQ = useActions({ limit: 50 })

  const isLoading =
    usersQ.isLoading || projectsQ.isLoading || instancesQ.isLoading

  const stats = useMemo(() => {
    const instances = instancesQ.data ?? []
    const failedLast24h = (actionsQ.data?.data ?? []).filter((a) => {
      if (a.status !== "FAILED") return false
      const startedAt = new Date(a.started_at).getTime()
      // eslint-disable-next-line react-hooks/purity
      return Date.now() - startedAt < 24 * 60 * 60 * 1000
    }).length
    const byType = instances.reduce<Record<InstanceType, number>>(
      (acc, i) => {
        acc[i.type] = (acc[i.type] ?? 0) + 1
        return acc
      },
      { VPS: 0, RDS: 0, REDIS: 0, STORAGE: 0 }
    )
    return {
      users: (usersQ.data ?? []).length,
      projects: (projectsQ.data ?? []).length,
      total: instances.length,
      active: instances.filter((i) => i.is_active).length,
      byType,
      failedLast24h,
    }
  }, [usersQ.data, projectsQ.data, instancesQ.data, actionsQ.data])

  if (isLoading) return <LoadingPage label="Loading admin overview…" />
  if (usersQ.isError || projectsQ.isError || instancesQ.isError) {
    return (
      <ErrorState
        title="We couldn't load the admin overview"
        error={
          (usersQ.error as Error) ??
          (projectsQ.error as Error) ??
          (instancesQ.error as Error)
        }
        onRetry={() => {
          usersQ.refetch()
          projectsQ.refetch()
          instancesQ.refetch()
        }}
      />
    )
  }

  const recentActions = (actionsQ.data?.data ?? []).slice(0, 8)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Admin overview
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          The pulse of the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label="Users"
          value={stats.users}
          to="/admin/users"
        />
        <StatTile
          icon={Cloud}
          label="Projects"
          value={stats.projects}
          to="/admin/projects"
        />
        <StatTile
          icon={Server}
          label="Instances"
          value={stats.total}
          hint={`${stats.active} active`}
          to="/admin/instances"
        />
        <StatTile
          icon={AlertOctagon}
          label="Failed (24h)"
          value={stats.failedLast24h}
          tone={stats.failedLast24h > 0 ? "danger" : "neutral"}
          to="/activity"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By type</CardTitle>
            <Link
              to="/admin/instances"
              className="text-sm font-medium text-primary hover:underline"
            >
              All instances
            </Link>
          </CardHeader>
          <ul className="space-y-2">
            <TypeRow icon={Server} label="Servers" count={stats.byType.VPS} />
            <TypeRow
              icon={Database}
              label="Databases"
              count={stats.byType.RDS}
            />
            <TypeRow icon={Zap} label="Caches" count={stats.byType.REDIS} />
            <TypeRow
              icon={Folder}
              label="Storage"
              count={stats.byType.STORAGE}
            />
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <Link
              to="/activity"
              className="text-sm font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </CardHeader>
          {recentActions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border-subtle bg-surface-sunken/50 px-4 py-6 text-center text-sm text-fg-muted">
              No recent activity.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {recentActions.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {a.action_type}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatRelative(a.started_at)} ·{" "}
                      <Link
                        to={`/instances/${a.instance_id}`}
                        className="text-primary hover:underline"
                      >
                        view instance
                      </Link>
                    </p>
                  </div>
                  <StatusPill status={a.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  tone = "neutral",
}: {
  icon: typeof Server
  label: string
  value: number
  hint?: string
  to: string
  tone?: "neutral" | "danger"
}) {
  return (
    <Link to={to} className="block">
      <Card interactive padding="md">
        <div className="flex items-start gap-3">
          <div
            className={
              tone === "danger"
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-danger-soft text-danger-fg"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className="text-[1.5rem] font-semibold leading-tight text-fg">
              {value}
            </p>
            {hint ? (
              <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>
            ) : null}
          </div>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-fg-subtle"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  )
}

function TypeRow({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Server
  label: string
  count: number
}) {
  return (
    <li className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-sunken">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-fg-muted" aria-hidden />
        <span className="text-sm text-fg">{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums text-fg-muted">
        {count}
      </span>
    </li>
  )
}

// Re-export Activity icon for downstream consumers.
void Activity
