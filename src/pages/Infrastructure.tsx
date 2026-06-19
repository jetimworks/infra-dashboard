import { Navbar } from "../components/layout/Navbar"
import { Card } from "../components/ui/Card"
import { Server, Database, Activity, Wifi, Info } from "lucide-react"

export function InfrastructurePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Infrastructure & Performance</h1>
          <p className="text-gray-500">Transparency. See exactly what you're paying for.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Compute */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Compute (VPS)</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Healthy</span>
            </div>
            <div className="space-y-4">
              <MetricBar label="CPU Usage" value={32} tooltip="Current processor load. Lower is better." />
              <MetricBar label="RAM Usage" value={60} tooltip="Memory in use. If this hits 100%, we auto-scale." />
              <p className="text-sm text-gray-500">Using 1.2GB of 2GB RAM</p>
            </div>
          </Card>

          {/* Database */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Database (Postgres)</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Healthy</span>
            </div>
            <div className="space-y-4">
              <MetricBar label="Storage" value={20} tooltip="SSD space used. We alert at 80%." />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Connections</span>
                <span className="font-medium text-gray-900">45 / 1000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Query Time</span>
                <span className="font-medium text-gray-900">12ms</span>
              </div>
            </div>
          </Card>

          {/* Cache */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cache (Redis)</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Healthy</span>
            </div>
            <div className="space-y-4">
              <MetricBar label="Memory" value={46} tooltip="RAM used by cache. 256MB total." />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cache Hit Rate</span>
                <span className="font-medium text-emerald-600">94%</span>
              </div>
            </div>
          </Card>

          {/* Network */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-900">Network & API</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Healthy</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">API Success Rate</span>
                <span className="font-medium text-emerald-600">99.9%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Latency</span>
                <span className="font-medium text-gray-900">145ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bandwidth (24h)</span>
                <span className="font-medium text-gray-900">In: 2.4GB / Out: 8.1GB</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

function MetricBar({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  const color = value > 80 ? "bg-rose-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-600">{label}</span>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block w-48 text-center z-10">
              {tooltip}
            </div>
          </div>
        </div>
        <span className="text-sm font-bold text-gray-900">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}
