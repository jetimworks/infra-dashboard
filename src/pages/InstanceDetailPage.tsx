import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  Activity,
  ChevronRight,
  Database,
  Folder,
  HardDriveDownload,
  LineChart,
  Send,
  type LucideIcon,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { useInstance } from "../queries/instances"
import { useInstanceMetricsLatest } from "../queries/metrics"
import { useSecurityCheck } from "../queries/security"
import { useInstanceActions } from "../queries/actions"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Tabs } from "../components/ui/Tabs"
import { Button } from "../components/ui/Button"
import { Input, Field, Textarea } from "../components/ui/Input"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { StatusPill } from "../components/ui/StatusPill"
import { MetricTile } from "../components/data/MetricTile"
import { SecurityFindingItem } from "../components/data/SecurityFindingItem"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { formatBytes, formatRelative } from "../lib/utils"
import type {
  InstanceType,
  SecurityOverallStatus,
  InstanceMetric,
} from "../api/types"

type TabValue =
  | "overview"
  | "metrics"
  | "security"
  | "backups"
  | "activity"
  | "settings"

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

const overallStatusLabel: Record<SecurityOverallStatus, string> = {
  safe: "Looking good",
  needs_attention: "Needs a look",
  action_required: "Action needed",
}

export function InstanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>("overview")
  const [refreshNonce, setRefreshNonce] = useState(0)

  const instanceQ = useInstance(id)
  const metricsQ = useInstanceMetricsLatest(id)
  const securityQ = useSecurityCheck(id, refreshNonce > 0)
  const actionsQ = useInstanceActions(id, { limit: 50 })

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }
  if (!instanceQ.data) {
    return (
      <ErrorState
        title="This server doesn't exist"
        description="It may have been removed. Head back to your infrastructure to find what you need."
        onRetry={() => navigate("/instances")}
      />
    )
  }

  const instance = instanceQ.data
  const Icon = typeIcon[instance.type]
  const supportsBackups = instance.type === "RDS" || instance.type === "REDIS"

  const tabItems: { value: TabValue; label: string; icon: LucideIcon }[] = [
    { value: "overview", label: "Overview", icon: Activity },
    { value: "metrics", label: "Metrics", icon: LineChart },
    { value: "security", label: "Security", icon: ShieldCheck },
    ...(supportsBackups
      ? [
          {
            value: "backups" as TabValue,
            label: "Backups",
            icon: HardDriveDownload,
          },
        ]
      : []),
    { value: "activity", label: "Activity", icon: Activity },
    { value: "settings", label: "Settings", icon: SettingsIcon },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/instances" className="hover:text-fg">
          Infrastructure
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">{instance.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
              {instance.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-fg-muted">
              <span>{typeLabel[instance.type]}</span>
              {instance.host ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-mono">{instance.host}</span>
                </>
              ) : null}
              {!instance.is_active ? (
                <StatusPill status="inactive" size="sm" />
              ) : null}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRefreshNonce((n) => n + 1)
            securityQ.refetch()
          }}
        >
          Check now
        </Button>
      </div>

      <Tabs value={tab} onChange={setTab} items={tabItems} />

      {tab === "overview" ? (
        <OverviewTab
          instanceType={instance.type}
          metrics={metricsQ.data}
          metricsLoading={metricsQ.isLoading}
          security={securityQ.data}
          securityLoading={securityQ.isLoading}
        />
      ) : tab === "metrics" ? (
        <MetricsTab instanceId={id!} type={instance.type} />
      ) : tab === "security" ? (
        <SecurityTab
          security={securityQ.data}
          loading={securityQ.isLoading}
          instanceType={instance.type}
        />
      ) : tab === "backups" ? (
        <BackupsTab instanceId={id!} instanceType={instance.type} />
      ) : tab === "activity" ? (
        <ActivityTab
          actions={actionsQ.data?.data ?? []}
          loading={actionsQ.isLoading}
        />
      ) : (
        <SettingsTab instance={instance} />
      )}
    </div>
  )
}

function OverviewTab({
  instanceType,
  metrics,
  metricsLoading,
  security,
  securityLoading,
}: {
  instanceType: InstanceType
  metrics?: Record<string, InstanceMetric>
  metricsLoading: boolean
  security?: import("../api/types").SecurityCheck
  securityLoading: boolean
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Live status
        </h2>
        {metricsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile loading label="Loading" value="—" />
            <MetricTile loading label="Loading" value="—" />
            <MetricTile loading label="Loading" value="—" />
            <MetricTile loading label="Loading" value="—" />
          </div>
        ) : !metrics || Object.keys(metrics).length === 0 ? (
          <Card>
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              No metrics have been collected yet. We'll start showing numbers
              after the first check.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(metrics).slice(0, 4).map((m) => (
              <MetricTile
                key={m.metric_name}
                label={m.metric_name}
                value={m.value != null ? String(m.value) : "—"}
                status={m.success ? "ok" : "danger"}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Security at a glance
        </h2>
        {securityLoading ? (
          <Card>
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              Checking security…
            </p>
          </Card>
        ) : !security ? (
          <Card>
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              We haven't run a security check on this {typeLabel[instanceType].toLowerCase()} yet.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <StatusPill
                    status={security.overall_status}
                    label={overallStatusLabel[security.overall_status]}
                    size="md"
                  />
                </div>
                <p className="mt-2 text-[0.9375rem] text-fg-muted">
                  {security.overall_status === "safe"
                    ? "We didn't find anything that needs your attention."
                    : security.overall_status === "needs_attention"
                      ? "A few things could use a look. Nothing urgent."
                      : "There are issues that need your attention."}
                </p>
              </div>
              {security.last_checked_at ? (
                <p className="text-xs text-fg-subtle">
                  Last checked {formatRelative(security.last_checked_at)}
                </p>
              ) : null}
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}

function MetricsTab({
  instanceId,
  type,
}: {
  instanceId: string
  type: InstanceType
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <Link
          to={`/instances/${instanceId}/metrics`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Open full charts
        </Link>
      </CardHeader>
      <p className="px-4 py-6 text-center text-sm text-fg-muted">
        Charts for this {typeLabel[type].toLowerCase()} will appear on the
        metrics page.
      </p>
    </Card>
  )
}

function SecurityTab({
  security,
  loading,
  instanceType,
}: {
  security?: import("../api/types").SecurityCheck
  loading: boolean
  instanceType: InstanceType
}) {
  if (loading) {
    return (
      <Card>
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Checking security…
        </p>
      </Card>
    )
  }
  if (!security) {
    return (
      <Card>
        <EmptyState
          icon={ShieldCheck}
          title="No security check yet"
          description="Tap 'Check now' at the top to run a fresh security scan on this resource."
        />
      </Card>
    )
  }
  const sorted = [...security.findings].sort((a, b) => {
    const order = { action_required: 0, warning: 1, ok: 2 } as const
    return order[a.status] - order[b.status]
  })
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <StatusPill
              status={security.overall_status}
              label={overallStatusLabel[security.overall_status]}
              size="md"
            />
            <p className="mt-3 text-[0.9375rem] text-fg-muted">
              {security.findings.length} finding
              {security.findings.length === 1 ? "" : "s"} for this{" "}
              {typeLabel[instanceType].toLowerCase()}.
            </p>
          </div>
          {security.last_checked_at ? (
            <p className="text-xs text-fg-subtle">
              Last checked {formatRelative(security.last_checked_at)}
            </p>
          ) : null}
        </div>
      </Card>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No findings"
            description="Nothing to fix — your resource is in great shape."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((f, i) => (
            <SecurityFindingItem key={i} finding={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function BackupsTab({
  instanceId,
  instanceType,
}: {
  instanceId: string
  instanceType: InstanceType
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backups</CardTitle>
        <Link
          to={`/instances/${instanceId}/backups`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Open backups
        </Link>
      </CardHeader>
      <p className="px-4 py-6 text-center text-sm text-fg-muted">
        All your {typeLabel[instanceType].toLowerCase()} backups live on the
        backups page.
      </p>
    </Card>
  )
}

function ActivityTab({
  actions,
  loading,
}: {
  actions: import("../api/types").Action[]
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Loading activity…
        </p>
      </Card>
    )
  }
  if (actions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Backups, security patches, and certificate renewals for this server will show up here."
        />
      </Card>
    )
  }
  return (
    <div className="space-y-2">
      {actions.map((a) => (
        <ActionTimelineItem key={a.id} action={a} />
      ))}
    </div>
  )
}

function SettingsTab({
  instance,
}: {
  instance: import("../api/types").Instance
}) {
  const configRecord = instance.config as Record<string, unknown>
  const sizeBytes =
    typeof configRecord?.size_bytes === "number"
      ? configRecord.size_bytes
      : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <DetailRow label="Name" value={instance.name} />
          <DetailRow label="Type" value={typeLabel[instance.type]} />
          <DetailRow
            label="Status"
            value={instance.is_active ? "Active" : "Inactive"}
          />
          {instance.host ? (
            <DetailRow label="Host" value={instance.host} mono />
          ) : null}
          {instance.port != null ? (
            <DetailRow label="Port" value={String(instance.port)} mono />
          ) : null}
          {instance.domain ? (
            <DetailRow label="Domain" value={instance.domain} mono />
          ) : null}
          {instance.username ? (
            <DetailRow label="Username" value={instance.username} mono />
          ) : null}
          <DetailRow
            label="Created"
            value={formatRelative(instance.created_at)}
          />
          <DetailRow
            label="Updated"
            value={formatRelative(instance.updated_at)}
          />
          {instance.config &&
          Object.keys(instance.config).length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-fg-muted">
                Configuration
              </dt>
              <dd className="mt-1 rounded-md border border-border-subtle bg-surface-sunken p-3">
                <pre className="overflow-x-auto font-mono text-xs text-fg">
                  {JSON.stringify(instance.config, null, 2)}
                </pre>
              </dd>
              {sizeBytes != null ? (
                <p className="mt-2 text-xs text-fg-muted">
                  Total size: {formatBytes(sizeBytes)}
                </p>
              ) : null}
            </div>
          ) : null}
        </dl>
      </Card>

      {instance.type === "VPS" ? <RequestActionForm instanceName={instance.name} /> : null}
    </div>
  )
}

function RequestActionForm({ instanceName }: { instanceName: string }) {
  const [subject, setSubject] = useState("Restart a service")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!details.trim()) {
      toast.error("Please describe what you need.")
      return
    }
    setSubmitting(true)
    // Simulate a brief request. The real customer-facing workflow isn't
    // built yet — the backend's /system-action endpoint requires admin, so
    // for now we open the user's mail client with the request pre-filled.
    const body = encodeURIComponent(
      `Hi team,\n\nI'd like to request the following action on ${instanceName}:\n\n${details}\n\nThanks!`
    )
    const subj = encodeURIComponent(`[${instanceName}] ${subject}`)
    window.location.href = `mailto:support@jetimworks.com?subject=${subj}&body=${body}`
    toast.success("Opening your email client…")
    setSubmitting(false)
    setDetails("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request an action</CardTitle>
      </CardHeader>
      <p className="text-sm text-fg-muted">
        Need us to restart a service, install an update, or change a setting?
        Tell us what you need and we'll get it done.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="What kind of request" htmlFor="request-subject">
          <Input
            id="request-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Restart nginx, install an update"
          />
        </Field>
        <Field
          label="Tell us more"
          htmlFor="request-details"
          required
          hint="The more detail you give, the faster we can help."
        >
          <Textarea
            id="request-details"
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What needs to happen, and why?"
          />
        </Field>
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            leftIcon={Send}
          >
            Send request
          </Button>
        </div>
      </form>
    </Card>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd
        className={
          mono
            ? "mt-0.5 font-mono text-sm text-fg"
            : "mt-0.5 text-sm text-fg"
        }
      >
        {value}
      </dd>
    </div>
  )
}
