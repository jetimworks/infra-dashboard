import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Server,
} from "lucide-react"
import { useAuth } from "../auth/useAuth"
import { useProject } from "../contexts/ProjectContext"
import { useInstances } from "../queries/instances"
import { useActions } from "../queries/actions"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { cn } from "../lib/utils"
import type { Instance } from "../api/types"

type OverallStatus = "operational" | "needs_attention" | "action_required"

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return "Still up?"
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function overallStatus(
  instances: Instance[] | undefined
): OverallStatus {
  if (!instances || instances.length === 0) return "operational"
  const inactive = instances.filter((i) => !i.is_active).length
  if (inactive > 0) return "action_required"
  return "operational"
}

function statusCopy(status: OverallStatus, count: number): {
  title: string
  body: string
  tone: "success" | "warning" | "danger"
  icon: typeof CheckCircle2
} {
  if (status === "operational") {
    return {
      title: count === 0 ? "You're all set up" : "Everything is running",
      body:
        count === 0
          ? "When you have servers, databases, or storage, you'll see them here. We'll watch them for you around the clock."
          : "All your servers, databases, and storage are doing fine. We'll let you know the moment something needs attention.",
      tone: "success",
      icon: CheckCircle2,
    }
  }
  if (status === "needs_attention") {
    return {
      title: "Something needs a look",
      body: "A few things could use your attention. Take a peek when you can — nothing urgent.",
      tone: "warning",
      icon: AlertTriangle,
    }
  }
  return {
    title: "Action needed",
    body: "One or more of your resources are turned off or have an issue. Tap below to find out more.",
    tone: "danger",
    icon: AlertOctagon,
  }
}

export function DashboardPage() {
  const { user } = useAuth()
  const { selectedProjectId } = useProject()
  const instancesQ = useInstances()
  const actionsQ = useActions({ limit: 5 })

  const allInstances = instancesQ.data ?? []
  const instances = useMemo(
    () =>
      selectedProjectId
        ? allInstances.filter((i) => i.project_id === selectedProjectId)
        : allInstances,
    [allInstances, selectedProjectId]
  )
  const recentActions = useMemo(() => {
    const actions = actionsQ.data?.data ?? []
    if (!selectedProjectId) return actions
    const projectInstanceIds = new Set(
      allInstances
        .filter((i) => i.project_id === selectedProjectId)
        .map((i) => i.id)
    )
    return actions.filter((a) => projectInstanceIds.has(a.instance_id))
  }, [actionsQ.data, allInstances, selectedProjectId])

  const overall = useMemo(
    () => overallStatus(instances),
    [instances]
  )
  const hero = useMemo(
    () => statusCopy(overall, instances.length),
    [overall, instances.length]
  )
  const firstName = user?.first_name ?? ""
  const HeroIcon = hero.icon

  if (instancesQ.isLoading) {
    return <LoadingPage label="Checking on your servers…" />
  }
  if (instancesQ.isError) {
    return (
      <ErrorState
        title="We couldn't load your overview"
        error={instancesQ.error as Error}
        onRetry={() => instancesQ.refetch()}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-[0.9375rem] text-fg-muted">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Your infrastructure
        </h1>
      </div>

      {/* Status hero */}
      <div
        className={cn(
          "rounded-lg border p-6",
          hero.tone === "success"
            ? "border-success-soft bg-success-soft/40"
            : hero.tone === "warning"
              ? "border-warning-soft bg-warning-soft/40"
              : "border-danger-soft bg-danger-soft/40"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white",
              hero.tone === "success"
                ? "bg-success"
                : hero.tone === "warning"
                  ? "bg-warning"
                  : "bg-danger"
            )}
          >
            <HeroIcon className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.25rem] font-semibold text-fg">{hero.title}</h2>
            <p className="mt-1 text-[0.9375rem] text-fg-muted">{hero.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                to="/instances"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-fg-on-accent shadow-sm transition-colors hover:bg-primary-hover"
              >
                View your {instances.length} server{instances.length === 1 ? "" : "s"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link
                to="/activity"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
              >
                See recent activity
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Server}
          label="Servers and services"
          value={instances.length}
          to={selectedProjectId ? `/instances?project_id=${selectedProjectId}` : "/instances"}
        />
        <StatCard icon={Activity} label="Recent actions" value={recentActions.length} to="/activity" />
      </div>

      {/* Recent activity */}
      <section>
        <Card>
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
              Nothing yet. When you trigger a backup, renew a certificate, or
              apply a security patch, you'll see it here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentActions.map((action) => (
                <ActionTimelineItem key={action.id} action={action} />
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Server
  label: string
  value: number
  to: string
}) {
  return (
    <Link to={to} className="block">
      <Card interactive padding="md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-xs text-fg-muted">{label}</p>
            <p className="text-[1.5rem] font-semibold leading-tight text-fg">
              {value}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
