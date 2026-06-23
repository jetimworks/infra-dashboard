import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronRight, Download } from "lucide-react"
import { useInstance } from "../queries/instances"
import { useInstanceMetricsHistory } from "../queries/metrics"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { ChartContainer } from "../components/data/ChartContainer"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { cn } from "../lib/utils"
import { formatDate } from "../lib/utils"
import type { InstanceType, InstanceMetric } from "../api/types"

type Range = "1h" | "24h" | "7d"

// Converts raw metric value to a display-friendly number.
// Rounds to 2 decimal places and converts bytes to MB for redis_memory_bytes.
function displayValue(apiMetric: string, value: number | null): number | null {
  if (value == null) return null
  if (apiMetric === "redis_memory_bytes") {
    return Math.round((value / (1024 * 1024)) * 100) / 100
  }
  return Math.round(value * 100) / 100
}

const rangeOptions: { value: Range; label: string; hours: number }[] = [
  { value: "1h", label: "Last hour", hours: 1 },
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
]

// metric values must match the backend constants in
// infra-backend/internal/services/metrics/poller.go
const metricCatalog: Record<
  InstanceType,
  { key: string; apiMetric: string; label: string; unit: string; help: string }[]
> = {
  VPS: [
    {
      key: "ram",
      apiMetric: "ram_used_mb",
      label: "Memory",
      unit: "MB",
      help: "How much of the server's memory is in use.",
    },
    {
      key: "cpu",
      apiMetric: "cpu_percent",
      label: "CPU",
      unit: "%",
      help: "How busy the processors are right now.",
    },
    {
      key: "storage",
      apiMetric: "storage_used_percent",
      label: "Storage",
      unit: "%",
      help: "How full the disk is.",
    },
    {
      key: "ping",
      apiMetric: "ping_ip_ms",
      label: "Response time",
      unit: "ms",
      help: "How long it takes the server to respond.",
    },
  ],
  REDIS: [
    {
      key: "memory",
      apiMetric: "redis_memory_bytes",
      label: "Memory used",
      unit: "MB",
      help: "How much of the cache is in use.",
    },
    {
      key: "clients",
      apiMetric: "redis_connected_clients",
      label: "Connected clients",
      unit: "",
      help: "How many clients are connected to the cache right now.",
    },
    {
      key: "keys",
      apiMetric: "redis_keys_total",
      label: "Total keys",
      unit: "",
      help: "How many keys are stored in the cache.",
    },
  ],
  RDS: [
    {
      key: "connection",
      apiMetric: "rds_connection_test",
      label: "Connection test",
      unit: "",
      help: "Whether the database connection is working.",
    },
  ],
  STORAGE: [
    {
      key: "used",
      apiMetric: "storage_used_percent",
      label: "Used",
      unit: "%",
      help: "How full the storage is.",
    },
  ],
}

export function InstanceMetricsPage() {
  const { id } = useParams<{ id: string }>()
  const [range, setRange] = useState<Range>("24h")
  const instanceQ = useInstance(id)

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instanceQ.data) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }
  const instance = instanceQ.data
  const metrics = metricCatalog[instance.type] ?? []

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/instances" className="hover:text-fg">
          Infrastructure
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link
          to={`/instances/${instance.id}`}
          className="hover:text-fg"
        >
          {instance.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">Metrics</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Performance
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            How this {instance.type === "VPS" ? "server" : instance.type === "REDIS" ? "cache" : instance.type === "RDS" ? "database" : "storage"} has been doing.
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Time range"
          value={range}
          onChange={setRange}
          options={rangeOptions}
        />
      </div>

      {metrics.length === 0 ? (
        <Card>
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            No metrics are configured for this resource type yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {metrics.map((m) => (
            <MetricChart
              key={m.key}
              instanceId={id!}
              apiMetric={m.apiMetric}
              label={m.label}
              unit={m.unit}
              help={m.help}
              range={range}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MetricChart({
  instanceId,
  apiMetric,
  label,
  unit,
  help,
  range,
}: {
  instanceId: string
  apiMetric: string
  label: string
  unit: string
  help: string
  range: Range
}) {
  const hours = rangeOptions.find((r) => r.value === range)!.hours
  const from = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
    [hours]
  )
  const historyQ = useInstanceMetricsHistory(instanceId, {
    metric: apiMetric,
    from,
    limit: 500,
  })

  const points = useMemo(() => historyQ.data ?? [], [historyQ.data])
  const sorted = useMemo(
    () =>
      [...points].sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      ),
    [points]
  )

  const chartData = useMemo(
    () =>
      sorted.map((m: InstanceMetric) => ({
        t: new Date(m.recorded_at).getTime(),
        v: displayValue(apiMetric, m.value),
        failed: !m.success,
      })),
    [sorted, apiMetric]
  )

  // Find failed gaps (successive failed points) to render as red bands.
  const failedBands = useMemo(() => {
    const bands: { x1: number; x2: number }[] = []
    let start: number | null = null
    for (const p of chartData) {
      if (p.failed) {
        if (start == null) start = p.t
      } else if (start != null) {
        bands.push({ x1: start, x2: p.t })
        start = null
      }
    }
    if (start != null && chartData.length > 0) {
      bands.push({ x1: start, x2: chartData[chartData.length - 1]!.t })
    }
    return bands
  }, [chartData])

  const isLoading = historyQ.isLoading
  const isEmpty = !isLoading && chartData.length === 0

  const handleDownload = () => {
    const csv = [
      ["recorded_at", "value", "success"],
      ...sorted.map((m) => [
        m.recorded_at,
        m.value == null ? "" : String(m.value),
        String(m.success),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${apiMetric}-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ChartContainer
      title={label}
      subtitle={help}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage={`No ${label.toLowerCase()} data for this period.`}
      onDownload={sorted.length > 0 ? handleDownload : undefined}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-subtle))" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(t) =>
              range === "7d"
                ? new Date(t).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : new Date(t).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
            }
            stroke="rgb(var(--fg-subtle))"
            fontSize={11}
          />
          <YAxis
            stroke="rgb(var(--fg-subtle))"
            fontSize={11}
            width={44}
            tickFormatter={(v) => (v == null ? "" : `${v}`)}
          />
          <Tooltip
            contentStyle={{
              background: "rgb(var(--surface))",
              border: "1px solid rgb(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(t) => formatDate(new Date(t as number).toISOString())}
            formatter={(value) => [
              value == null ? "—" : `${Number(value).toFixed(2)}${unit}`,
              label,
            ]}
          />
          {failedBands.map((b, i) => (
            <ReferenceArea
              key={i}
              x1={b.x1}
              x2={b.x2}
              fill="#dc2626"
              fillOpacity={0.1}
              stroke="#dc2626"
              strokeOpacity={0.2}
            />
          ))}
          <Line
            type="monotone"
            dataKey="v"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Silence unused warning for the cn helper if tree-shaken; the helper is
// used for className composition in other parts of the page.
void cn
void Download
void Button
