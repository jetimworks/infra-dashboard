import { Navbar } from "../components/layout/Navbar"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Shield, Download, Lock, AlertTriangle, CheckCircle2, FileText } from "lucide-react"

export function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security & Backups</h1>
          <p className="text-gray-500">Sleep at night. We've got your back.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Backup Management */}
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Backup Management</h3>
              </div>
              <Button size="sm" variant="outline">Trigger Manual Backup</Button>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 mb-4">
              <p className="text-sm font-medium text-emerald-800">Last Backup: Completed today at 02:00 AM (Size: 4.2GB)</p>
            </div>
            <div className="space-y-2">
              <BackupItem date="June 18, 02:00 AM" size="4.2GB" />
              <BackupItem date="June 17, 02:00 AM" size="4.1GB" />
              <BackupItem date="June 16, 02:00 AM" size="4.1GB" />
            </div>
          </Card>

          {/* Security Posture */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Security Posture</h3>
            </div>
            <ul className="space-y-3">
              <SecurityItem icon={CheckCircle2} label="SSL/TLS Status" value="Valid. Expires in 84 days." color="emerald" />
              <SecurityItem icon={Lock} label="Firewall Status" value="Active. 3 rules configured." color="emerald" />
              <SecurityItem icon={AlertTriangle} label="Threat Block" value="Blocked 452 malicious SSH attempts (24h)." color="amber" />
              <SecurityItem icon={CheckCircle2} label="OS Patch Level" value="Up to date. Last patched 4 days ago." color="emerald" />
            </ul>
          </Card>

          {/* Audit Log */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="border-l-2 border-blue-500 pl-3">
                <p className="font-medium text-gray-900">June 18: Updated Nginx configuration</p>
                <p className="text-gray-500">Optimized keep-alive timeouts for better performance.</p>
              </li>
              <li className="border-l-2 border-gray-200 pl-3">
                <p className="font-medium text-gray-900">June 15: Database Maintenance</p>
                <p className="text-gray-500">Rebuilt indexes to improve query speed.</p>
              </li>
              <li className="border-l-2 border-gray-200 pl-3">
                <p className="font-medium text-gray-900">June 10: Security Patch</p>
                <p className="text-gray-500">Applied critical OS security updates.</p>
              </li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}

function BackupItem({ date, size }: { date: string; size: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{date}</p>
        <p className="text-xs text-gray-500">Size: {size}</p>
      </div>
      <Button size="sm" variant="ghost">Request Restore</Button>
    </div>
  )
}

function SecurityItem({ icon: Icon, label, value, color }: any) {
  const colorClasses = color === "emerald" ? "text-emerald-600" : "text-amber-600"
  return (
    <li className="flex items-start gap-3">
      <Icon className={`h-5 w-5 mt-0.5 ${colorClasses}`} />
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{value}</p>
      </div>
    </li>
  )
}
