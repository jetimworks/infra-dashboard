import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Code2,
  Database,
  Folder,
  GitBranch,
  HardDriveDownload,
  LineChart,
  type LucideIcon,
  ListTree,
  Plus,
  Power,
  Rocket,
  ScrollText,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react"
import { useInstance, useTestDbConnection } from "../queries/instances"
import { useInstanceMetricsLatest } from "../queries/metrics"
import { useBackups } from "../queries/backups"
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
import { BackupItem } from "../components/data/BackupItem"
import { SecurityFindingItem } from "../components/data/SecurityFindingItem"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { ActionRequestCard } from "../components/data/ActionRequestCard"
import { ActionRequestCreateDialog } from "../components/feedback/ActionRequestCreateDialog"
import { normalizeError } from "../api/errors"
import { formatBytes, formatRelative, cn } from "../lib/utils"
import { DEFAULT_SERVICE_NAME, resolveServiceName } from "../lib/service-name"
import {
  dbErrorGuidance,
  DEFAULT_DB_PORT,
  DEFAULT_DB_SSL_MODE,
  readRemoteDbConfig,
} from "../lib/remote-db"
import type {
  DbTestConnectionResponse,
  Instance,
  InstanceType,
  SecurityCheck,
  SecurityOverallStatus,
  InstanceMetric,
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
  REMOTE_RDS: Database,
  REDIS: Zap,
  STORAGE: Folder,
}
const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REMOTE_RDS: "Remote database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

const overallStatusLabel: Record<SecurityOverallStatus, string> = {
  safe: "Looking good",
  needs_attention: "Needs a look",
  action_required: "Action needed",
}

/**
 * "safe" does not always mean "we ran a check and it passed".
 *
 * The backend hard-codes `safe` plus one `ok` finding titled "Security checks
 * don't apply to this service" for REDIS, STORAGE and REMOTE_RDS
 * (infra-backend/internal/services/security_check/service.go:92), and never
 * sets last_checked_at on those paths — nothing ran. The converse also holds,
 * which is what makes the timestamp safe to key on: for VPS and RDS every
 * finding builder returns skipFinding (status action_required) when the audit
 * is missing, and rollupStatus only returns `safe` when no finding is
 * `warning` or `action_required`. So `safe` there is only ever reachable with
 * an audit present, and that audit's timestamp is set.
 *
 * So the missing timestamp is the honest signal: `safe` with no check time
 * means nobody looked. Rendering the normal green all-clear here would
 * report an unaudited resource as verified — worse than saying nothing,
 * because an all-clear is a claim.
 */
function isUninspected(security: SecurityCheck): boolean {
  return security.overall_status === "safe" && !security.last_checked_at
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
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
                {instance.name}
              </h1>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-fg-muted">
                <span className="whitespace-nowrap">{typeLabel[instance.type]}</span>
                {instance.host ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="min-w-0 flex-1 truncate font-mono">{instance.host}</span>
                  </>
                ) : null}
                {instance.type === "VPS" && instance.github_repo ? (
                  <>
                    <span aria-hidden>·</span>
                    <a
                      href={`https://github.com/${instance.github_repo}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-w-0 items-center gap-1 truncate hover:text-fg hover:underline"
                    >
                      <Code2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{instance.github_repo}</span>
                    </a>
                  </>
                ) : null}
                {instance.type === "VPS" && instance.github_repo && instance.github_branch ? (
                  <>
                    <span aria-hidden>·</span>
                    <a
                      href={`https://github.com/${instance.github_repo}/tree/${instance.github_branch}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 hover:text-fg hover:underline"
                    >
                      <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="font-mono">{instance.github_branch}</span>
                    </a>
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
            onViewSecurity={() => setTab("security")}
          />
        ) : tab === "metrics" ? (
          <MetricsTab instanceId={id!} />
        ) : tab === "security" ? (
          <SecurityTab
            security={securityQ.data}
            loading={securityQ.isLoading}
            instanceType={instance.type}
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
  onViewSecurity,
}: {
  instanceType: InstanceType
  metrics?: Record<string, InstanceMetric>
  metricsLoading: boolean
  security?: import("../api/types").SecurityCheck
  securityLoading: boolean
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
              const uninspected = isUninspected(security)
              return (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {uninspected ? (
                        <StatusPill
                          status="not_checked"
                          label="Not checked"
                          size="md"
                        />
                      ) : (
                        <StatusPill
                          status={displayStatus}
                          label={overallStatusLabel[displayStatus]}
                          size="md"
                        />
                      )}
                    </div>
                    <p className="mt-2 text-[0.9375rem] text-fg-muted">
                      {uninspected
                        ? "Nothing was inspected. This resource is managed outside the platform, so there isn't a check for us to run."
                        : displayStatus === "safe"
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
}: {
  instanceId: string
}) {
  const metricsQ = useInstanceMetricsLatest(instanceId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          to={`/instances/${instanceId}/metrics`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open full charts
        </Link>
      </div>

      <Link
        to={`/instances/${instanceId}/metrics`}
        className="block text-sm font-medium text-primary hover:underline"
      >
        Go to metrics page →
      </Link>

      {metricsQ.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile loading label="Loading" value="—" />
          <MetricTile loading label="Loading" value="—" />
          <MetricTile loading label="Loading" value="—" />
          <MetricTile loading label="Loading" value="—" />
        </div>
      ) : !metricsQ.data || Object.keys(metricsQ.data).length === 0 ? (
        <Card>
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            No metrics have been collected yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(metricsQ.data).slice(0, 4).map((m) => {
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
    </div>
  )
}

function SecurityTab({
  security,
  loading,
  instanceType,
  onRequestAction,
}: {
  security?: import("../api/types").SecurityCheck
  loading: boolean
  instanceType: InstanceType
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
            {isUninspected(security) ? (
              <StatusPill status="not_checked" label="Not checked" size="md" />
            ) : (
              <StatusPill
                status={security.overall_status}
                label={overallStatusLabel[security.overall_status]}
                size="md"
              />
            )}
            <p className="mt-3 text-[0.9375rem] text-fg-muted">
              {isUninspected(security)
                ? "Nothing was inspected. There's no security check for a resource we manage from outside the platform."
                : `${security.findings.length} finding${security.findings.length === 1 ? "" : "s"} for this ${typeLabel[instanceType].toLowerCase()}.`}
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
  const backupsQ = useBackups(instanceId)
  const backups = backupsQ.data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          to={`/instances/${instanceId}/backups`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open backups
        </Link>
      </div>

      <Link
        to={`/instances/${instanceId}/backups`}
        className="block text-sm font-medium text-primary hover:underline"
      >
        Go to backups page →
      </Link>

      {backupsQ.isLoading ? (
        <Card>
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Loading backups…
          </p>
        </Card>
      ) : backupsQ.isError ? (
        <Card>
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Couldn't load backups.
          </p>
        </Card>
      ) : backups.length === 0 ? (
        <Card>
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            No backups yet. Go to the backups page to create one.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {backups.slice(0, 5).map((backup) => (
            <BackupItem
              key={backup.action_id}
              backup={backup}
              instanceType={instanceType}
            />
          ))}
        </div>
      )}
    </div>
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
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const configRecord = instance.config as Record<string, unknown>
  const remoteDb = readRemoteDbConfig(instance.config)
  const sizeBytes =
    typeof configRecord?.size_bytes === "number"
      ? configRecord.size_bytes
      : null

  return (
    <div className="space-y-4">
      {instance.type === "VPS" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Deploy</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                Run <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">/root/deploy.sh</code> on this server and see the output inline.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Rocket}
              onClick={() => navigate(`/instances/${instance.id}/deploy`)}
            >
              Open deploy page
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      {instance.type === "VPS" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>App control</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                Start, stop, restart, or check the status of the
                {" "}
                <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                  {resolveServiceName(instance)}
                </code>
                {" "}
                service running on this server.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Power}
              onClick={() => navigate(`/instances/${instance.id}/app-control`)}
            >
              Open app control
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      {instance.type === "VPS" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Nginx logs</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                Browse the files in
                {" "}
                <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">/var/log/nginx/</code>
                {" "}
                and tail the most recent lines. Rotated <code className="font-mono text-[0.8125rem]">.gz</code> files are listed but can't be read in v1.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={ScrollText}
              onClick={() => navigate(`/instances/${instance.id}/nginx-logs`)}
            >
              Open log viewer
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      {instance.type === "REMOTE_RDS" ? (
        <RemoteDatabaseCard instance={instance} />
      ) : null}

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
          {instance.type === "VPS" && instance.github_repo ? (
            <DetailRow
              label="GitHub repo"
              value={
                <a
                  href={`https://github.com/${instance.github_repo}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  {instance.github_repo}
                </a>
              }
              mono
            />
          ) : null}
          {instance.type === "VPS" && instance.github_branch ? (
            <DetailRow
              label="Branch"
              value={
                <a
                  href={`https://github.com/${instance.github_repo ?? ""}/tree/${instance.github_branch}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  {instance.github_branch}
                </a>
              }
              mono
            />
          ) : null}
          {instance.type === "VPS" ? (
            <DetailRow
              label="Service"
              value={
                <>
                  {instance.service_name ?? DEFAULT_SERVICE_NAME}
                  {instance.service_name ? null : (
                    <span className="font-sans text-fg-muted">
                      {" "}
                      (default)
                    </span>
                  )}
                </>
              }
              mono
            />
          ) : null}
          {/* A REMOTE_RDS's config is fully understood now — four keys the
              backend writes and nothing else — so it gets typed rows instead
              of a JSON blob. Host, port and user are deliberately not
              repeated: they render above from the columns they were mirrored
              onto. */}
          {instance.type === "REMOTE_RDS" ? (
            <>
              <DetailRow label="Database" value={remoteDb.database} mono />
              <DetailRow label="TLS mode" value={remoteDb.sslMode} mono />
            </>
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
          Object.keys(instance.config).length > 0 &&
          instance.type !== "REMOTE_RDS" ? (
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

/**
 * The REMOTE_RDS Settings card: where we dial, and the two read-only probes
 * the registered credential unlocks.
 *
 * `testDbConnection` returns HTTP 200 whether or not the dial succeeded — the
 * verdict is the boolean `connected`, and a refusal is a *resolved* promise,
 * not a rejection. So both outcomes render in the same panel, differentiated
 * by the body field, and the catch block is reserved for transport and auth
 * failures (a 400 for a non-REMOTE_RDS, a 401, the network dropping). That
 * split is the whole reason this is a component with its own state rather
 * than a toast on the mutation: a toast cannot distinguish "the database
 * said no" from "we never got to ask".
 */
function RemoteDatabaseCard({ instance }: { instance: Instance }) {
  const navigate = useNavigate()
  const testConnection = useTestDbConnection()
  const [result, setResult] = useState<DbTestConnectionResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const db = readRemoteDbConfig(instance.config)
  // The column is authoritative and config.db_port is the canonicalised copy
  // of it; falling through the rest of the way means a row written before the
  // port was mirrored still renders the port we actually dial.
  const port = instance.port ?? db.port ?? DEFAULT_DB_PORT
  const endpoint = `${instance.host ?? "—"}:${port}`

  const run = async () => {
    setErrorMsg(null)
    setResult(null)
    try {
      // No ?database= override: the point of this button is to exercise the
      // settings the instance is actually configured with, so overriding it
      // here would test something nobody else would connect as.
      setResult(await testConnection.mutateAsync({ id: instance.id }))
    } catch (err) {
      setErrorMsg(
        normalizeError(err).message || "We couldn't run the connection test."
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Database</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            This database is hosted by its provider — we hold no shell on it.
            We connect directly, using the credentials on this instance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={ListTree}
            onClick={() => navigate(`/instances/${instance.id}/schemas`)}
          >
            Browse schema
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Activity}
            onClick={run}
            isLoading={testConnection.isPending}
          >
            Test connection
          </Button>
        </div>
      </CardHeader>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow label="Endpoint" value={endpoint} mono />
        <DetailRow label="Database" value={db.database || "—"} mono />
        <DetailRow label="User" value={instance.username ?? "—"} mono />
        <DetailRow
          label="TLS mode"
          value={
            <>
              {db.sslMode}
              {db.sslMode === DEFAULT_DB_SSL_MODE ? null : (
                <span className="font-sans text-fg-muted"> (custom)</span>
              )}
            </>
          }
          mono
        />
      </dl>

      {errorMsg ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-md bg-danger-soft p-4 text-sm text-danger-fg ring-1 ring-danger/25 ring-inset"
        >
          <XCircle className="h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">The test didn't run</p>
            <p className="mt-1 opacity-90">{errorMsg}</p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "mt-4 flex items-start gap-3 rounded-md p-4 ring-1 ring-inset",
            result.connected
              ? "bg-success-soft text-success-fg ring-success/25"
              : "bg-danger-soft text-danger-fg ring-danger/25"
          )}
        >
          {result.connected ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {result.connected
                ? "Connected"
                : `Couldn't connect to ${result.database || db.database}`}
            </p>
            {result.connected ? (
              <p className="mt-1 text-sm opacity-90">
                {result.server_version || "PostgreSQL"} responded in{" "}
                <span className="font-mono tabular-nums">
                  {result.latency_ms}ms
                </span>
                .
              </p>
            ) : (
              <>
                {result.error ? (
                  <p className="mt-1 font-mono text-xs opacity-90">
                    {result.error_code ? `${result.error_code}: ` : ""}
                    {result.error}
                  </p>
                ) : null}
                {result.error_code ? (
                  <p className="mt-2 text-sm opacity-90">
                    {dbErrorGuidance(result.error_code).text}
                  </p>
                ) : null}
              </>
            )}
            <p className="mt-2 text-xs opacity-70">
              Logged as action{" "}
              <span className="font-mono">{result.action_id}</span>
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
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
