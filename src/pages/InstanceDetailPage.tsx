import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Database,
  Folder,
  HardDriveDownload,
  LineChart,
  type LucideIcon,
  Plus,
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
import { useActionRequests } from "../queries/action-requests"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Tabs } from "../components/ui/Tabs"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { StatusPill } from "../components/ui/StatusPill"
import { MetricTile } from "../components/data/MetricTile"
import { SecurityFindingItem } from "../components/data/SecurityFindingItem"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { ActionRequestCard } from "../components/data/ActionRequestCard"
import { ActionRequestCreateDialog } from "../components/feedback/ActionRequestCreateDialog"
import { formatBytes, formatRelative } from "../lib/utils"
import type {
  InstanceType,
  SecurityOverallStatus,
  InstanceMetric,
  Action,
} from "../api/types"

type TabValue =
  | "overview"
  | "metrics"
  | "security"
  | "backups"
  | "activity"
  | "action-requests"
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

const METRIC_HELP: Record<string, { label: string; unit: string; help: string }> = {
  // Redis
  redis_connected_clients: { label: "Connected clients", unit: "", help: "How many clients are connected to the cache right now." },
  redis_keys_total: { label: "Total keys", unit: "", help: "How many keys are stored in the cache." },
  redis_memory_bytes: { label: "Memory used", unit: "MB", help: "Amount of memory the cache is currently using." },
  redis_ping: { label: "Response time", unit: "ms", help: "How long the cache takes to respond to a ping." },
  redis_uptime_in_seconds: { label: "Uptime", unit: "hrs", help: "How long the cache has been running." },
  redis_mem_fragmentation_ratio: { label: "Memory fragmentation", unit: "", help: "Ratio of memory used by Redis vs. what the OS allocated." },

  // VPS (servers) - with prefix
  vps_ram: { label: "Memory", unit: "%", help: "How much of the server's memory is currently in use." },
  vps_cpu: { label: "CPU", unit: "%", help: "How busy the server's processors are right now." },
  vps_storage: { label: "Storage", unit: "%", help: "How full the server's disk is." },
  vps_ping: { label: "Response time", unit: "ms", help: "How long the server takes to respond." },
  vps_load_average: { label: "Load average", unit: "", help: "Average system load over the last minute." },
  vps_swap: { label: "Swap", unit: "%", help: "How much swap space is being used." },
  vps_disk_io_read: { label: "Disk read", unit: "MB/s", help: "How fast data is being read from disk." },
  vps_disk_io_write: { label: "Disk write", unit: "MB/s", help: "How fast data is being written to disk." },
  vps_network_rx: { label: "Network in", unit: "Mbps", help: "How much data the server is receiving." },
  vps_network_tx: { label: "Network out", unit: "Mbps", help: "How much data the server is sending." },

  // VPS (servers) - generic aliases without prefix
  ram: { label: "Memory", unit: "%", help: "How much of the server's memory is currently in use." },
  cpu: { label: "CPU", unit: "%", help: "How busy the server's processors are right now." },
  storage: { label: "Storage", unit: "%", help: "How full the server's disk is." },
  ping: { label: "Response time", unit: "ms", help: "How long the server takes to respond." },
  load_average: { label: "Load average", unit: "", help: "Average system load over the last minute." },
  swap: { label: "Swap", unit: "%", help: "How much swap space is being used." },
  disk_io_read: { label: "Disk read", unit: "MB/s", help: "How fast data is being read from disk." },
  disk_io_write: { label: "Disk write", unit: "MB/s", help: "How fast data is being written to disk." },
  network_rx: { label: "Network in", unit: "Mbps", help: "How much data the server is receiving." },
  network_tx: { label: "Network out", unit: "Mbps", help: "How much data the server is sending." },

  // RDS (databases)
  rds_connections: { label: "Connections", unit: "", help: "How many clients are connected to the database right now." },
  rds_cache_hit: { label: "Cache hit rate", unit: "%", help: "How often the database finds data in its cache instead of hitting the disk." },
  rds_memory_bytes: { label: "Memory used", unit: "MB", help: "Amount of memory the database is currently using." },
  rds_disk_usage: { label: "Disk usage", unit: "GB", help: "How much disk space the database is using." },
  rds_queries: { label: "Queries/sec", unit: "", help: "How many queries the database handles per second." },
  rds_slow_queries: { label: "Slow queries", unit: "", help: "Number of queries that took longer than expected." },
  rds_active_transactions: { label: "Active transactions", unit: "", help: "How many database transactions are currently running." },
  rds_connection_test: { label: "Connection test", unit: "", help: "Whether the database connection is working." },
  // RDS - generic aliases
  connections: { label: "Connections", unit: "", help: "How many clients are connected to the database right now." },
  cache_hit: { label: "Cache hit rate", unit: "%", help: "How often the database finds data in its cache instead of hitting the disk." },
  memory_bytes: { label: "Memory used", unit: "MB", help: "Amount of memory the database is currently using." },
  queries: { label: "Queries/sec", unit: "", help: "How many queries the database handles per second." },
  slow_queries: { label: "Slow queries", unit: "", help: "Number of queries that took longer than expected." },
  connection_test: { label: "Connection test", unit: "", help: "Whether the database connection is working." },

  // STORAGE
  storage_used: { label: "Used", unit: "%", help: "How full the storage bucket is." },
  storage_size_bytes: { label: "Total size", unit: "GB", help: "Total capacity of the storage bucket." },
  storage_object_count: { label: "Objects", unit: "", help: "How many files or objects are stored." },
  storage_last_sync: { label: "Last sync", unit: "", help: "When the storage was last synchronized." },
  // STORAGE - generic aliases
  used: { label: "Used", unit: "%", help: "How full the storage bucket is." },
  size_bytes: { label: "Total size", unit: "GB", help: "Total capacity of the storage bucket." },
  object_count: { label: "Objects", unit: "", help: "How many files or objects are stored." },
  last_sync: { label: "Last sync", unit: "", help: "When the storage was last synchronized." },

  // Common percent-based metrics
  cpu_percent: { label: "CPU", unit: "%", help: "How busy the processor is right now." },
  memory_percent: { label: "Memory", unit: "%", help: "How much memory is currently in use." },
  disk_percent: { label: "Disk", unit: "%", help: "How full the disk is." },
  swap_percent: { label: "Swap", unit: "%", help: "How much swap space is being used." },
  redis_memory_percent: { label: "Memory", unit: "%", help: "How much of the cache memory is in use." },
  redis_fragmentation: { label: "Fragmentation", unit: "", help: "Memory fragmentation ratio." },

  // Ping/monitoring metrics
  http_status: { label: "HTTP status", unit: "", help: "Whether the endpoint is responding with a valid status code." },
  ping_domain_ms: { label: "Domain ping", unit: "ms", help: "How long the domain takes to respond." },
  ping_ip_ms: { label: "IP ping", unit: "ms", help: "How long the IP address takes to respond." },
}

function metricHelp(metricName: string) {
  const info = METRIC_HELP[metricName]
  if (info) return info
  return { label: metricName, unit: "", help: "" }
}

function formatMetricValue(metricName: string, value: number | null): string | number {
  if (value == null) return "—"

  // Memory metrics in bytes -> MB
  if (metricName.includes("memory_bytes") || metricName.includes("memory_actual") || metricName.includes("memory_max")) {
    return Math.round(value / (1024 * 1024))
  }

  // Storage size in bytes -> GB
  if (metricName === "storage_size_bytes" || metricName === "size_bytes") {
    return (value / (1024 * 1024 * 1024)).toFixed(2)
  }

  // Uptime in seconds -> hours
  if (metricName.includes("uptime_in_seconds")) {
    return (value / 3600).toFixed(2)
  }

  // All percentage and decimal values -> 2 decimals
  if (metricName.includes("rate") || metricName.includes("cache_hit") || metricName.includes("percent") || metricName.includes("ratio") || metricName.includes("ms") || metricName.includes("load_average") || metricName.includes(" fragmentation")) {
    return value.toFixed(2)
  }

  // Disk usage in bytes -> GB
  if (metricName.includes("disk_usage")) {
    return (value / (1024 * 1024 * 1024)).toFixed(2)
  }

  return value
}

export function InstanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>("overview")
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [prefillTitle, setPrefillTitle] = useState("")
  const [prefillDescription, setPrefillDescription] = useState("")

  const instanceQ = useInstance(id)
  const metricsQ = useInstanceMetricsLatest(id)
  const securityQ = useSecurityCheck(id, refreshNonce > 0)
  const actionsQ = useInstanceActions(id, { limit: 50 })
  const actionRequestsQ = useActionRequests({ instanceId: id })

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
    { value: "action-requests", label: "Action Requests", icon: ClipboardList },
    { value: "settings", label: "Settings", icon: SettingsIcon },
  ]

  return (
    <>
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
            actions={actionsQ.data?.data ?? []}
            onViewSecurity={() => setTab("security")}
          />
        ) : tab === "metrics" ? (
          <MetricsTab instanceId={id!} type={instance.type} />
        ) : tab === "security" ? (
          <SecurityTab
            security={securityQ.data}
            loading={securityQ.isLoading}
            instanceType={instance.type}
            instanceId={id!}
            onRequestAction={(title, description) => {
              setPrefillTitle(title)
              setPrefillDescription(description)
              setCreateOpen(true)
            }}
          />
        ) : tab === "backups" ? (
          <BackupsTab instanceId={id!} instanceType={instance.type} />
        ) : tab === "activity" ? (
          <ActivityTab
            actions={actionsQ.data?.data ?? []}
            loading={actionsQ.isLoading}
          />
        ) : tab === "action-requests" ? (
          <ActionRequestsTab
            instanceId={id!}
            instanceName={instance.name}
            instanceType={instance.type}
            actionRequests={actionRequestsQ.data?.data ?? []}
            loading={actionRequestsQ.isLoading}
          />
        ) : (
          <SettingsTab instance={instance} />
        )}
      </div>

      <ActionRequestCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        instanceId={id}
        initialTitle={prefillTitle}
        initialDescription={prefillDescription}
      />
    </>
  )
}

function OverviewTab({
  instanceType,
  metrics,
  metricsLoading,
  security,
  securityLoading,
  actions,
  onViewSecurity,
}: {
  instanceType: InstanceType
  metrics?: Record<string, InstanceMetric>
  metricsLoading: boolean
  security?: import("../api/types").SecurityCheck
  securityLoading: boolean
  actions: Action[]
  onViewSecurity: () => void
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
            {Object.values(metrics).slice(0, 4).map((m) => {
              const info = metricHelp(m.metric_name)
              return (
                <MetricTile
                  key={m.metric_name}
                  label={info.label}
                  value={formatMetricValue(m.metric_name, m.value)}
                  unit={info.unit}
                  help={info.help}
                  status={m.success ? "ok" : "danger"}
                />
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            Security at a glance
          </h2>
          <button
            onClick={onViewSecurity}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </button>
        </div>
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
            {(() => {
              const displayStatus = security.overall_status
              return (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusPill
                        status={displayStatus}
                        label={overallStatusLabel[displayStatus]}
                        size="md"
                      />
                    </div>
                    <p className="mt-2 text-[0.9375rem] text-fg-muted">
                      {displayStatus === "safe"
                        ? "We didn't find anything that needs your attention."
                        : displayStatus === "needs_attention"
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
              )
            })()}
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
  instanceId,
  onRequestAction,
}: {
  security?: import("../api/types").SecurityCheck
  loading: boolean
  instanceType: InstanceType
  instanceId: string
  onRequestAction: (title: string, description: string) => void
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
            <SecurityFindingItem
              key={i}
              finding={f}
              actionButton={
                f.status === "action_required" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onRequestAction(
                        f.title,
                        f.detail
                          ? `${f.detail}${f.action ? `\n\nSuggested fix: ${f.action}` : ""}`
                          : f.action ?? ""
                      )
                    }
                  >
                    Request action
                  </Button>
                ) : undefined
              }
            />
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

function ActionRequestsTab({
  instanceId,
  instanceName,
  instanceType,
  actionRequests,
  loading,
}: {
  instanceId: string
  instanceName: string
  instanceType: InstanceType
  actionRequests: import("../api/types").ActionRequest[]
  loading: boolean
}) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => setCreateOpen(true)}
        >
          New Request
        </Button>
      </div>
      {loading ? (
        <p className="text-center text-sm text-fg-muted py-6">Loading…</p>
      ) : actionRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No action requests for this instance"
            description="Create a request and it'll show up here."
            action={{
              label: "Create request",
              onClick: () => setCreateOpen(true),
              variant: "primary",
              icon: Plus,
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {actionRequests.map((ar) => (
            <ActionRequestCard
              key={ar.id}
              actionRequest={ar}
              showInstance
              instanceName={instanceName}
              instanceType={instanceType}
            />
          ))}
        </div>
      )}
      <ActionRequestCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        instanceId={instanceId}
      />
    </div>
  )
}

function SettingsTab({
  instance,
}: {
  instance: import("../api/types").Instance
}) {
  const [createOpen, setCreateOpen] = useState(false)
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
              <dd className="mt-1 rounded-md border border-border/40 bg-surface-sunken p-3">
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

      <Card>
        <CardHeader>
          <CardTitle>Request an action</CardTitle>
        </CardHeader>
        <p className="text-sm text-fg-muted">
          Need us to restart a service, install an update, or change a setting?
          Tell us what you need and we'll get it done.
        </p>
        <div className="mt-4">
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => setCreateOpen(true)}
          >
            New Request
          </Button>
        </div>
      </Card>

      <ActionRequestCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        instanceId={instance.id}
      />
    </div>
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
