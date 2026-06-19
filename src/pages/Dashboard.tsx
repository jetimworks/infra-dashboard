import { Navbar } from "../components/layout/Navbar"
import { Card } from "../components/ui/Card"
import { Activity, Server, Database, Shield, CheckCircle2, Clock } from "lucide-react"

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Morning Coffee Overview</h1>
          <p className="text-gray-500">Instant reassurance. Everything is looking good.</p>
        </div>

        {/* Global Health Status */}
        <Card className="mb-8 border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-900">All Systems Operational</h2>
                <p className="text-emerald-700">99.98% Uptime (Last 30 Days)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-emerald-700">No active alerts</p>
              <p className="text-xs text-emerald-600">Last checked 2 mins ago</p>
            </div>
          </div>
        </Card>

        {/* Resource Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <ResourceCard icon={Server} title="Compute" status="Healthy" detail="1 Active Server" />
          <ResourceCard icon={Database} title="Database" status="Healthy" detail="Postgres" />
          <ResourceCard icon={Shield} title="Cache" status="Healthy" detail="Redis" />
        </div>

        {/* Recent Activity Feed */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h3>
          <ul className="space-y-4">
            <ActivityItem time="Today, 09:00 AM" text="Automated daily backup completed successfully." />
            <ActivityItem time="Yesterday, 02:00 AM" text="OS security patches applied." />
            <ActivityItem time="2 days ago" text="SSL certificate auto-renewed." />
            <ActivityItem time="3 days ago" text="Database optimized, query time reduced by 15%." />
          </ul>
        </Card>
      </main>
    </div>
  )
}

function ResourceCard({ icon: Icon, title, status, detail }: any) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-lg font-bold text-gray-900">{detail}</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          {status}
        </span>
      </div>
    </Card>
  )
}

function ActivityItem({ time, text }: { time: string; text: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Clock className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{text}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </li>
  )
}
