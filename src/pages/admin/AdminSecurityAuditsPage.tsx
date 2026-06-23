import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import {
  ChevronRight,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { useInstances } from "../../queries/instances"
import {
  useSecurityAudit,
  useRdsSecurityAudit,
} from "../../queries/security"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { SegmentedControl } from "../../components/ui/SegmentedControl"
import { StatusPill } from "../../components/ui/StatusPill"
import { AdminTabs } from "../../components/layout/AdminTabs"
import { Drawer } from "../../components/ui/Drawer"
import { formatDate } from "../../lib/utils"
import type { Instance } from "../../api/types"

type Tab = "VPS" | "RDS"

const tabOptions: { value: Tab; label: string; icon: typeof Server }[] = [
  { value: "VPS", label: "VPS servers", icon: Server },
  { value: "RDS", label: "Databases", icon: Database },
]

export function AdminSecurityAuditsPage() {
  const [tab, setTab] = useState<Tab>("VPS")
  const vpsQ = useInstances({ type: "VPS" })
  const rdsQ = useInstances({ type: "RDS" })
  const [selected, setSelected] = useState<Instance | null>(null)

  const instances = (tab === "VPS" ? vpsQ.data : rdsQ.data) ?? []
  const query = tab === "VPS" ? vpsQ : rdsQ

  const isLoading = tab === "VPS" ? vpsQ.isLoading : rdsQ.isLoading
  const isError = tab === "VPS" ? vpsQ.isError : rdsQ.isError
  const refetch = tab === "VPS" ? () => vpsQ.refetch() : () => rdsQ.refetch()

  if (isLoading) return <LoadingPage label="Loading instances…" />
  if (isError) {
    return (
      <ErrorState
        title="We couldn't load instances"
        error={query.error as Error}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6">
      <AdminTabs />

      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Security audits
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Full security audits for every VPS and database. Open a row to see
          the raw data — what you do with it is up to you.
        </p>
      </div>

      <SegmentedControl
        ariaLabel="Audit type"
        value={tab}
        onChange={setTab}
        options={tabOptions}
      />

      {instances.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title={`No ${tab === "VPS" ? "servers" : "databases"} yet`}
            description={
              tab === "VPS"
                ? "Add a server to see its security audit here."
                : "Add a database to see its security audit here."
            }
          />
        </Card>
      ) : (
        <Card padding="sm">
          <CardHeader className="px-3">
            <CardTitle>
              {instances.length} {tab === "VPS" ? "server" : "database"}
              {instances.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border-subtle">
            {instances.map((instance) => (
              <li key={instance.id} className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => setSelected(instance)}
                  className="flex w-full items-center gap-3 rounded-md text-left transition-colors hover:bg-surface-sunken"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    {tab === "VPS" ? (
                      <Server className="h-4 w-4" aria-hidden />
                    ) : (
                      <Database className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">
                      {instance.name}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {instance.host ?? "—"}
                      {instance.domain ? ` · ${instance.domain}` : ""}
                    </p>
                  </div>
                  <StatusPill
                    status={instance.is_active ? "active" : "inactive"}
                    size="sm"
                  />
                  <ChevronRight className="h-4 w-4 text-fg-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AuditDrawer
        instance={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

function AuditDrawer({
  instance,
  onClose,
}: {
  instance: Instance | null
  onClose: () => void
}) {
  const [refresh, setRefresh] = useState(false)
  const isVps = instance?.type === "VPS"
  const vpsAudit = useSecurityAudit(isVps ? instance?.id : undefined, refresh)
  const rdsAudit = useRdsSecurityAudit(!isVps && instance?.type === "RDS" ? instance?.id : undefined, refresh)

  const auditQ = isVps ? vpsAudit : rdsAudit
  const audit = auditQ.data
  const auditJson = useMemo(
    () => (audit ? JSON.stringify(audit, null, 2) : ""),
    [audit]
  )

  return (
    <Drawer
      open={!!instance}
      onClose={onClose}
      title={instance ? `Security audit · ${instance.name}` : "Security audit"}
      description={
        instance
          ? `${instance.host ?? instance.id} · ${instance.type}`
          : undefined
      }
      widthClass="w-full max-w-3xl"
    >
      {instance ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg-muted">
              {audit?.run_at
                ? `Last run ${formatDate(audit.run_at)}`
                : "Loading audit…"}
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              onClick={() => {
                setRefresh(false)
                // Force-refetch by toggling refresh param off-then-on so the
                // query key stays stable but the underlying request fires.
                requestAnimationFrame(() => {
                  setRefresh(true)
                  auditQ.refetch().then(() => toast.success("Security scan complete"))
                })
              }}
            >
              Check now
            </Button>
          </div>

          {auditQ.isLoading ? (
            <p className="rounded-md border border-border/40 bg-surface-sunken p-4 text-sm text-fg-muted">
              Loading audit…
            </p>
          ) : auditQ.isError ? (
            <ErrorState
              title="We couldn't load this audit"
              error={auditQ.error as Error}
              onRetry={() => auditQ.refetch()}
            />
          ) : audit ? (
            <>
              {isVps ? (
                <VpsSummary
                  audit={audit as unknown as VpsAuditLike}
                />
              ) : (
                <RdsSummary
                  audit={audit as unknown as RdsAuditLike}
                />
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Raw response
                  </p>
                  <Link
                    to={`/admin/instances/${instance.id}/edit`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open instance →
                  </Link>
                </div>
                <pre className="max-h-96 overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-xs text-fg">
                  {auditJson}
                </pre>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}

// Minimal view-models for the summary cards. We don't import the full audit
// types to avoid coupling the admin UI to the security namespace beyond what's
// already in src/api/types.ts — these views only read a handful of fields.
interface VpsAuditLike {
  ssl?: { valid: boolean; expires_at: string | null }
  firewall?: { active: boolean; rules: string[] }
  os?: { kernel: string; security_updates: number }
  rate_limit?: { enabled: boolean; req_per_min: number }
  hsts?: { enabled: boolean; max_age: number }
  backup?: { encrypted: boolean; path: string }
  database?: { connections: number; connection_max: number; superusers: string[] }
  ssh_failed_attempts_24h?: number
  nginx_version?: string
  last_security_patch_at?: string | null
}

interface RdsAuditLike {
  backup_encrypted?: boolean
  backup_path?: string | null
  last_backup_at?: string | null
  publicly_accessible?: boolean
  ssl_enforced?: boolean
  superuser_count?: number
  superusers?: string[] | null
  audit_logging_enabled?: boolean
  password_policy_enabled?: boolean
  min_password_length?: number
  extensions?: string[] | null
  password_hashes_exposed?: boolean
  buffer_cache_hit_ratio?: number
}

function VpsSummary({ audit }: { audit: VpsAuditLike }) {
  const issues: { label: string; status: "ok" | "warning" | "danger" }[] = []
  if (audit.ssl && !audit.ssl.valid) issues.push({ label: "SSL invalid", status: "danger" })
  if (audit.firewall && !audit.firewall.active) issues.push({ label: "Firewall off", status: "danger" })
  if (audit.os && audit.os.security_updates > 0) issues.push({ label: `${audit.os.security_updates} security updates pending`, status: "warning" })
  if (audit.rate_limit && !audit.rate_limit.enabled) issues.push({ label: "No rate limit", status: "warning" })
  if (audit.hsts && !audit.hsts.enabled) issues.push({ label: "HSTS disabled", status: "warning" })
  if (audit.backup && !audit.backup.encrypted) issues.push({ label: "Backups unencrypted", status: "danger" })
  if ((audit.database?.superusers?.length ?? 0) > 1) issues.push({ label: `${audit.database?.superusers?.length} DB superusers`, status: "warning" })
  if ((audit.ssh_failed_attempts_24h ?? 0) > 50) issues.push({ label: `${audit.ssh_failed_attempts_24h} failed SSH in 24h`, status: "warning" })

  return (
    <>
      {issues.length === 0 ? (
        <div className="flex items-start gap-3 rounded-md border border-success-soft bg-success-soft/40 p-3 text-sm text-fg">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" aria-hidden />
          <div>
            <p className="font-medium text-success-fg">Everything looks good</p>
            <p className="text-fg-muted">No flagged issues in the latest audit.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-warning-soft bg-warning-soft/30 p-3">
          <p className="text-sm font-medium text-warning-fg">
            {issues.length} item{issues.length === 1 ? "" : "s"} to review
          </p>
          <ul className="mt-2 space-y-1.5">
            {issues.map((i, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-fg"
              >
                {i.status === "danger" ? (
                  <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                )}
                {i.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="SSL" value={audit.ssl?.valid ? "Valid" : "Invalid"} tone={audit.ssl?.valid ? "ok" : "danger"} />
        <Field label="Firewall" value={audit.firewall?.active ? "Active" : "Inactive"} tone={audit.firewall?.active ? "ok" : "danger"} />
        <Field label="Security updates" value={String(audit.os?.security_updates ?? 0)} tone={(audit.os?.security_updates ?? 0) > 0 ? "warning" : "ok"} />
        <Field label="Rate limit" value={audit.rate_limit ? `${audit.rate_limit.req_per_min}/min` : "—"} />
        <Field label="HSTS" value={audit.hsts ? (audit.hsts.enabled ? `Enabled (${audit.hsts.max_age}s)` : "Disabled") : "—"} />
        <Field label="Backup encryption" value={audit.backup?.encrypted ? "Encrypted" : "Unencrypted"} tone={audit.backup?.encrypted ? "ok" : "danger"} />
        <Field label="SSH failures (24h)" value={String(audit.ssh_failed_attempts_24h ?? 0)} />
        <Field label="Nginx" value={audit.nginx_version ?? "—"} />
        <Field label="Last patch" value={audit.last_security_patch_at ? formatDate(audit.last_security_patch_at) : "Never"} />
        <Field label="Kernel" value={audit.os?.kernel ?? "—"} />
      </div>
    </>
  )
}

function RdsSummary({ audit }: { audit: RdsAuditLike }) {
  const issues: { label: string; status: "ok" | "warning" | "danger" }[] = []
  if (audit.backup_encrypted === false) issues.push({ label: "Backups unencrypted", status: "danger" })
  if (audit.publicly_accessible === true) issues.push({ label: "Publicly accessible", status: "danger" })
  if (audit.ssl_enforced === false) issues.push({ label: "SSL not enforced", status: "warning" })
  if ((audit.superuser_count ?? 0) > 1) issues.push({ label: `${audit.superuser_count} superusers`, status: "warning" })
  if (audit.audit_logging_enabled === false) issues.push({ label: "Audit logging disabled", status: "warning" })
  if (audit.password_policy_enabled === false) issues.push({ label: "Password policy off", status: "warning" })
  if (audit.password_hashes_exposed === true) issues.push({ label: "Password hashes exposed", status: "danger" })

  return (
    <>
      {issues.length === 0 ? (
        <div className="flex items-start gap-3 rounded-md border border-success-soft bg-success-soft/40 p-3 text-sm text-fg">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" aria-hidden />
          <div>
            <p className="font-medium text-success-fg">Everything looks good</p>
            <p className="text-fg-muted">No flagged issues in the latest audit.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-warning-soft bg-warning-soft/30 p-3">
          <p className="text-sm font-medium text-warning-fg">
            {issues.length} item{issues.length === 1 ? "" : "s"} to review
          </p>
          <ul className="mt-2 space-y-1.5">
            {issues.map((i, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-fg"
              >
                {i.status === "danger" ? (
                  <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                )}
                {i.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Backups encrypted" value={audit.backup_encrypted ? "Yes" : "No"} tone={audit.backup_encrypted ? "ok" : "danger"} />
        <Field label="Last backup" value={audit.last_backup_at ? formatDate(audit.last_backup_at) : "—"} />
        <Field label="Publicly accessible" value={audit.publicly_accessible ? "Yes" : "No"} tone={audit.publicly_accessible ? "danger" : "ok"} />
        <Field label="SSL enforced" value={audit.ssl_enforced ? "Yes" : "No"} tone={audit.ssl_enforced ? "ok" : "warning"} />
        <Field label="Superusers" value={String(audit.superuser_count ?? 0)} tone={(audit.superuser_count ?? 0) > 1 ? "warning" : "ok"} />
        <Field label="Audit logging" value={audit.audit_logging_enabled ? "Enabled" : "Disabled"} tone={audit.audit_logging_enabled ? "ok" : "warning"} />
        <Field label="Password policy" value={audit.password_policy_enabled ? `On (min ${audit.min_password_length})` : "Off"} tone={audit.password_policy_enabled ? "ok" : "warning"} />
        <Field label="Buffer cache hit" value={`${(audit.buffer_cache_hit_ratio ?? 0).toFixed(1)}%`} />
      </div>
    </>
  )
}

function Field({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "ok" | "warning" | "danger"
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger-fg"
      : tone === "warning"
      ? "text-warning-fg"
      : tone === "ok"
      ? "text-success-fg"
      : "text-fg"
  return (
    <div className="rounded-md border border-border/40 bg-surface p-3">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className={`mt-1 text-sm font-medium ${toneClass}`}>{value}</p>
    </div>
  )
}