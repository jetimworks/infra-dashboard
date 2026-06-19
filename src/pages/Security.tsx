import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Shield, Download, Lock, AlertTriangle, CheckCircle2, FileText } from "lucide-react"

export function SecurityPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Security & Backups</h1>
        <p className="text-[var(--text-secondary)]">Sleep at night. We've got your back.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Backup Management */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)] lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Backup Management</h3>
            </div>
            <Button size="sm" variant="outline" className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Trigger Manual Backup</Button>
          </div>
          <div className="rounded-lg bg-[var(--success-subtle)] p-4 mb-6 border border-[var(--success)]/20">
            <p className="text-sm font-medium text-[var(--success)]">Last Backup: Completed today at 02:00 AM (Size: 4.2GB)</p>
          </div>
          <div className="space-y-3">
            <BackupItem date="June 18, 02:00 AM" size="4.2GB" />
            <BackupItem date="June 17, 02:00 AM" size="4.1GB" />
            <BackupItem date="June 16, 02:00 AM" size="4.1GB" />
          </div>
        </Card>

        {/* Security Posture */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center gap-3">
            <Shield className="h-5 w-5 text-[var(--success)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Security Posture</h3>
          </div>
          <ul className="space-y-4">
            <SecurityItem icon={CheckCircle2} label="SSL/TLS Status" value="Valid. Expires in 84 days." color="emerald" />
            <SecurityItem icon={Lock} label="Firewall Status" value="Active. 3 rules configured." color="emerald" />
            <SecurityItem icon={AlertTriangle} label="Threat Block" value="Blocked 452 malicious SSH attempts (24h)." color="amber" />
            <SecurityItem icon={CheckCircle2} label="OS Patch Level" value="Up to date. Last patched 4 days ago." color="emerald" />
          </ul>
        </Card>

        {/* Audit Log */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Audit Log</h3>
          </div>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-4 pb-4 border-b border-[var(--border-color)] last:border-0 last:pb-0">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">June 18: Updated Nginx configuration</p>
                <p className="text-[var(--text-secondary)] mt-1">Optimized keep-alive timeouts for better performance.</p>
              </div>
            </li>
            <li className="flex gap-4 pb-4 border-b border-[var(--border-color)] last:border-0 last:pb-0">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-[var(--border-color)] shrink-0" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">June 15: Database Maintenance</p>
                <p className="text-[var(--text-secondary)] mt-1">Rebuilt indexes to improve query speed.</p>
              </div>
            </li>
            <li className="flex gap-4 pb-4 border-b border-[var(--border-color)] last:border-0 last:pb-0">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-[var(--border-color)] shrink-0" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">June 10: Security Patch</p>
                <p className="text-[var(--text-secondary)] mt-1">Applied critical OS security updates.</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function BackupItem({ date, size }: { date: string; size: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)]">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{date}</p>
        <p className="text-xs text-[var(--text-secondary)]">Size: {size}</p>
      </div>
      <Button size="sm" variant="ghost" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Request Restore</Button>
    </div>
  )
}

function SecurityItem({ icon: Icon, label, value, color }: { icon: typeof CheckCircle2; label: string; value: string; color: string }) {
  const colorClasses = color === "emerald" ? "text-[var(--success)]" : "text-amber-500"
  return (
    <li className="flex items-start gap-4">
      <Icon className={`h-5 w-5 mt-0.5 ${colorClasses}`} />
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-secondary)]">{value}</p>
      </div>
    </li>
  )
}
