import { Card } from "../components/ui/Card"
import { Server, Database, Activity, Wifi, Info } from "lucide-react"

export function InfrastructurePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Infrastructure & Performance</h1>
        <p className="text-[var(--text-secondary)]">Transparency. See exactly what you're paying for.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Compute */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Compute (VPS)</h3>
            </div>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1 text-xs font-medium text-[var(--success)]">Healthy</span>
          </div>
          <div className="space-y-5">
            <MetricBar label="CPU Usage" value={32} tooltip="Current processor load. Lower is better." />
            <MetricBar label="RAM Usage" value={60} tooltip="Memory in use. If this hits 100%, we auto-scale." />
            <p className="text-sm text-[var(--text-secondary)]">Using 1.2GB of 2GB RAM</p>
          </div>
        </Card>

        {/* Database */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Database (Postgres)</h3>
            </div>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1 text-xs font-medium text-[var(--success)]">Healthy</span>
          </div>
          <div className="space-y-5">
            <MetricBar label="Storage" value={20} tooltip="SSD space used. We alert at 80%." />
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Connections</span>
              <span className="font-medium text-[var(--text-primary)]">45 / 1000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Avg Query Time</span>
              <span className="font-medium text-[var(--text-primary)]">12ms</span>
            </div>
          </div>
        </Card>

        {/* Cache */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-rose-500" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Cache (Redis)</h3>
            </div>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1 text-xs font-medium text-[var(--success)]">Healthy</span>
          </div>
          <div className="space-y-5">
            <MetricBar label="Memory" value={46} tooltip="RAM used by cache. 256MB total." />
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Cache Hit Rate</span>
              <span className="font-medium text-[var(--success)]">94%</span>
            </div>
          </div>
        </Card>

        {/* Network */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-cyan-500" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Network & API</h3>
            </div>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1 text-xs font-medium text-[var(--success)]">Healthy</span>
          </div>
          <div className="space-y-5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">API Success Rate</span>
              <span className="font-medium text-[var(--success)]">99.9%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Avg Latency</span>
              <span className="font-medium text-[var(--text-primary)]">145ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Bandwidth (24h)</span>
              <span className="font-medium text-[var(--text-primary)]">In: 2.4GB / Out: 8.1GB</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MetricBar({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  const color = value > 80 ? "bg-red-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-[var(--text-muted)] cursor-help" />
            <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] group-hover:block w-48 text-center z-10 border border-[var(--border-color)]">
              {tooltip}
            </div>
          </div>
        </div>
        <span className="text-sm font-bold text-[var(--text-primary)]">{value}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}
