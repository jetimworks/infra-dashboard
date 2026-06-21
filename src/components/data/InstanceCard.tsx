import { Link } from "react-router-dom"
import {
  ChevronRight,
  Database,
  Folder,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Card } from "../ui/Card"
import { StatusPill } from "../ui/StatusPill"
import { Skeleton } from "../ui/LoadingState"
import type { Instance, InstanceMetricsLatest, InstanceType } from "../../api/types"

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

export interface InstanceCardProps {
  instance: Instance
  latestMetrics?: InstanceMetricsLatest
  loading?: boolean
}

export function InstanceCard({ instance, latestMetrics, loading }: InstanceCardProps) {
  const Icon = typeIcon[instance.type]
  const status = rollupStatus(latestMetrics)
  const stale = isStale(latestMetrics)

  if (loading) {
    return (
      <Card>
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </Card>
    )
  }

  return (
    <Card interactive padding="md">
      <Link to={`/instances/${instance.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-[1.0625rem] font-semibold text-fg">
                {instance.name}
              </h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                {typeLabel[instance.type]}
                {instance.host ? (
                  <>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono">{instance.host}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <StatusPill status={status} size="sm" />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-fg-muted">
          <span>{stale ? "Stale data" : "Updated just now"}</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </div>
      </Link>
    </Card>
  )
}

function rollupStatus(metrics?: InstanceMetricsLatest): "ok" | "warning" | "danger" {
  if (!metrics) return "ok"
  const values = Object.values(metrics)
  if (values.some((m) => !m.success)) return "danger"
  return "ok"
}

function isStale(metrics?: InstanceMetricsLatest): boolean {
  if (!metrics) return false
  const ts = Object.values(metrics).map((m) => m.recorded_at).filter(Boolean)
  if (ts.length === 0) return true
  const latest = Math.max(...ts.map((t) => new Date(t).getTime()))
  return Date.now() - latest > 5 * 60 * 1000
}

InstanceCard.displayName = "InstanceCard"
