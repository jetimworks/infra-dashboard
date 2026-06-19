import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { FileText, CreditCard, Users, Download, Mail } from "lucide-react"

export function ReportsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reports & Account</h1>
        <p className="text-[var(--text-secondary)]">Manage your plan, team, and reporting preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Reporting Center */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Reporting Center</h3>
          </div>
          <div className="space-y-4 mb-6">
            <ReportItem title="Monthly Report - May 2026" date="Generated on June 1" />
            <ReportItem title="Weekly Report - Week 24" date="Generated on June 15" />
          </div>
          <div className="border-t border-[var(--border-color)] pt-5">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Email Preferences</p>
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <Mail className="h-4 w-4" />
              <span>Weekly reports sent to admin@company.com</span>
            </div>
          </div>
        </Card>

        {/* Plan & Billing */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Plan & Billing</h3>
          </div>
          <div className="rounded-lg bg-[var(--bg-tertiary)] p-5 mb-5 border border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-secondary)]">Current Plan</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">StartUp Tier ($70/mo)</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">1,000 concurrent connections guaranteed.</p>
          </div>
          <div className="flex justify-between text-sm mb-5">
            <span className="text-[var(--text-secondary)]">Next Invoice</span>
            <span className="font-medium text-[var(--text-primary)]">July 1, 2026 - $70.00</span>
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="outline" className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Upgrade Plan</Button>
            <Button size="sm" variant="ghost" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Downgrade</Button>
          </div>
        </Card>

        {/* Team Access */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)] lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-cyan-500" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Team Access</h3>
            </div>
            <Button size="sm" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">Invite Developer</Button>
          </div>
          <div className="space-y-4">
            <TeamMember name="John Doe" email="john@company.com" role="Owner" />
            <TeamMember name="Jane Smith" email="jane@company.com" role="Read-Only" />
          </div>
        </Card>
      </div>
    </div>
  )
}

function ReportItem({ title, date }: { title: string; date: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)]">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{date}</p>
      </div>
      <Button size="sm" variant="ghost" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><Download className="h-4 w-4" /></Button>
    </div>
  )
}

function TeamMember({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)]">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{email}</p>
      </div>
      <span className="rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-color)]">{role}</span>
    </div>
  )
}
