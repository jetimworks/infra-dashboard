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

const rangeOptions: { value: Range; label: string; hours: number }[] = [
  { value: "1h", label: "Last hour", hours: 1 },
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
]

const metricCatalog: Record<
  InstanceType,
  { key: string; label: string; unit: string; help: string }[]
> = {
  VPS: [
    {
      key: "ram",
      label: "Memory",
      unit: "%",
      help: "How much of the server's memory is in use.",
    },
    {
      key: "cpu",
      label: "CPU",
      unit: "%",
      help: "How busy the processors are right now.",
    },
    {
      key: "storage",
      label: "Storage",
      unit: "%",
      help: "How full the disk is.",
    },
    {
      key: "ping",
      label: "Response time",
      unit: "ms",
      help: "How long it takes the server to respond.",
    },
  ],
  REDIS: [
    {
      key: "memory",
      label: "Memory used",
      unit: "%",
      help: "How much of the cache is in use.",
    },
    {
      key: "clients",
      label: "Connected clients",
      unit: "",
      help: "How many clients are connected to the cache right now.",
    },
    {
      key: "keys",
      label: "Total keys",
      unit: "",
      help: "How many keys are stored in the cache.",
    },
  ],
  RDS: [
    {
      key: "connections",
      label: "Connections",
      unit: "",
      help: "Active database connections.",
    },
    {
      key: "cache_hit",
      label: "Cache hit rate",
      unit: "%",
      help: "How often the database hits its cache instead of disk.",
    },
  ],
  STORAGE: [
    {
      key: "used",
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
              metric={m.key}
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
  metric,
  label,
  unit,
  help,
  range,
}: {
  instanceId: string
  metric: string
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
    metric,
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
        v: m.value,
        failed: !m.success,
      })),
    [sorted]
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
    a.download = `${metric}-${range}.csv`
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #e5e7eb)" />
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
            stroke="var(--fg-subtle, #94a3b8)"
            fontSize={11}
          />
          <YAxis
            stroke="var(--fg-subtle, #94a3b8)"
            fontSize={11}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(t) => formatDate(new Date(t as number).toISOString())}
            formatter={(value) => [
              value == null ? "—" : `${value}${unit}`,
              label,
            ]}
          />
          {failedBands.map((b, i) => (
            <ReferenceArea
              key={i}
              x1={b.x1}
              x2={b.x2}
              fill="var(--danger, #dc2626)"
              fillOpacity={0.08}
              stroke="var(--danger, #dc2626)"
              strokeOpacity={0.2}
            />
          ))}
          <Line
            type="monotone"
            dataKey="v"
            stroke="var(--primary, #2563eb)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
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
