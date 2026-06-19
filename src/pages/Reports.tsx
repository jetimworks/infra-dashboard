import { Navbar } from "../components/layout/Navbar"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { FileText, CreditCard, Users, Download, Mail } from "lucide-react"

export function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Account</h1>
          <p className="text-gray-500">Manage your plan, team, and reporting preferences.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reporting Center */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Reporting Center</h3>
            </div>
            <div className="space-y-3 mb-6">
              <ReportItem title="Monthly Report - May 2026" date="Generated on June 1" />
              <ReportItem title="Weekly Report - Week 24" date="Generated on June 15" />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Email Preferences</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>Weekly reports sent to admin@company.com</span>
              </div>
            </div>
          </Card>

          {/* Plan & Billing */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Plan & Billing</h3>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 mb-4">
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-xl font-bold text-gray-900">StartUp Tier ($70/mo)</p>
              <p className="text-xs text-gray-500 mt-1">1,000 concurrent connections guaranteed.</p>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-600">Next Invoice</span>
              <span className="font-medium text-gray-900">July 1, 2026 - $70.00</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Upgrade Plan</Button>
              <Button size="sm" variant="ghost">Downgrade</Button>
            </div>
          </Card>

          {/* Team Access */}
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-900">Team Access</h3>
              </div>
              <Button size="sm">Invite Developer</Button>
            </div>
            <div className="space-y-3">
              <TeamMember name="John Doe" email="john@company.com" role="Owner" />
              <TeamMember name="Jane Smith" email="jane@company.com" role="Read-Only" />
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

function ReportItem({ title, date }: { title: string; date: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{date}</p>
      </div>
      <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
    </div>
  )
}

function TeamMember({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{email}</p>
      </div>
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">{role}</span>
    </div>
  )
}
