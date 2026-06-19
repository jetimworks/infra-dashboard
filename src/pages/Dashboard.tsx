import { Card } from "../components/ui/Card"
import { Server, Database, Shield, CheckCircle2, Clock, type LucideIcon } from "lucide-react"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return { title: "Morning Coffee Overview", subtitle: "Start your day with instant reassurance. Everything is looking good." }
  } else if (hour < 16) {
    return { title: "Afternoon Check", subtitle: "Midday scan complete. Systems are running smoothly." }
  } else if (hour < 20) {
    return { title: "Evening Wrap-Up", subtitle: "Wind down knowing your infrastructure is secure." }
  } else {
    return { title: "Night Owl Watch", subtitle: "Late night monitoring active. All systems steady." }
  }
}

export function DashboardPage() {
  const greeting = getGreeting()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{greeting.title}</h1>
        <p className="text-[var(--text-secondary)]">{greeting.subtitle}</p>
      </div>

      {/* Global Health Status */}
      <Card className="mb-8 p-8 border-[var(--success)]/30 bg-[var(--success-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)] text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--success)]">All Systems Operational</h2>
              <p className="text-[var(--success)] opacity-70">99.98% Uptime (Last 30 Days)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[var(--success)]">No active alerts</p>
            <p className="text-xs text-[var(--text-muted)]">Last checked 2 mins ago</p>
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
      <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
        <h3 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h3>
        <ul className="space-y-4">
          <ActivityItem time="Today, 09:00 AM" text="Automated daily backup completed successfully." />
          <ActivityItem time="Yesterday, 02:00 AM" text="OS security patches applied." />
          <ActivityItem time="2 days ago" text="SSL certificate auto-renewed." />
          <ActivityItem time="3 days ago" text="Database optimized, query time reduced by 15%." />
        </ul>
      </Card>
    </div>
  )
}

function ResourceCard({ icon: Icon, title, status, detail }: { icon: LucideIcon; title: string; status: string; detail: string }) {
  return (
    <Card className="p-6 bg-[var(--card-bg)] border border-[var(--border-color)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-subtle)] text-[var(--success)]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{detail}</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-[var(--success-subtle)] px-3 py-1 text-xs font-medium text-[var(--success)]">
          {status}
        </span>
      </div>
    </Card>
  )
}

function ActivityItem({ time, text }: { time: string; text: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
        <Clock className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{text}</p>
        <p className="text-xs text-[var(--text-muted)]">{time}</p>
      </div>
    </li>
  )
}
