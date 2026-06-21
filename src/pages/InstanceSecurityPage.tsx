import { Link, useParams } from "react-router-dom"
import { ChevronRight, Lock, RefreshCw, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useInstance } from "../queries/instances"
import { useSecurityCheck } from "../queries/security"
import { useRenewSsl } from "../queries/ssl"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { StatusPill } from "../components/ui/StatusPill"
import { SecurityFindingItem } from "../components/data/SecurityFindingItem"
import { AsyncActionTracker } from "../components/feedback/AsyncActionTracker"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { formatRelative } from "../lib/utils"
import type { SecurityOverallStatus } from "../api/types"

const overallStatusLabel: Record<SecurityOverallStatus, string> = {
  safe: "Looking good",
  needs_attention: "Needs a look",
  action_required: "Action needed",
}

const overallStatusHelp: Record<SecurityOverallStatus, string> = {
  safe: "We didn't find anything that needs your attention. Keep it up.",
  needs_attention:
    "A few things could use a look. They're not urgent, but worth fixing when you can.",
  action_required:
    "These are issues we recommend you address soon to keep your server safe.",
}

export function InstanceSecurityPage() {
  const { id } = useParams<{ id: string }>()
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [sslConfirmOpen, setSslConfirmOpen] = useState(false)
  const [sslActionId, setSslActionId] = useState<string | null>(null)

  const instanceQ = useInstance(id)
  const securityQ = useSecurityCheck(id, refreshNonce > 0)
  const renewSsl = useRenewSsl()

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instanceQ.data) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }

  const instance = instanceQ.data
  const isVps = instance.type === "VPS"

  const handleRenewSsl = () => {
    if (!id) return
    renewSsl.mutate(id, {
      onSuccess: (data) => {
        setSslConfirmOpen(false)
        setSslActionId(data.action_id)
      },
    })
  }

  const security = securityQ.data
  const sorted = security
    ? [...security.findings].sort((a, b) => {
        const order = { action_required: 0, warning: 1, ok: 2 } as const
        return order[a.status] - order[b.status]
      })
    : []

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/instances" className="hover:text-fg">
          Infrastructure
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to={`/instances/${instance.id}`} className="hover:text-fg">
          {instance.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">Security</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Security check
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            A plain-English rundown of how safe this resource is.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRefreshNonce((n) => n + 1)
            securityQ.refetch()
          }}
          isLoading={securityQ.isFetching}
          leftIcon={RefreshCw}
        >
          Check now
        </Button>
      </div>

      {isVps ? (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Lock className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">
                  SSL certificate
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Renew the certificate used for HTTPS on this server. We'll
                  handle the request and refresh the security check.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSslConfirmOpen(true)}
              isLoading={renewSsl.isPending}
            >
              Renew certificate
            </Button>
          </div>
        </Card>
      ) : null}

      {securityQ.isLoading ? (
        <Card>
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            Checking security…
          </p>
        </Card>
      ) : !security ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No security check yet"
            description="Tap 'Check now' to run a fresh security scan on this resource."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div>
                <StatusPill
                  status={security.overall_status}
                  label={overallStatusLabel[security.overall_status]}
                  size="md"
                />
                <p className="mt-3 max-w-2xl text-[0.9375rem] text-fg-muted">
                  {overallStatusHelp[security.overall_status]}
                </p>
              </div>
              {security.last_checked_at ? (
                <p className="text-xs text-fg-subtle">
                  Last checked {formatRelative(security.last_checked_at)}
                </p>
              ) : null}
            </CardHeader>
            <p className="mt-2 text-sm text-fg-muted">
              {security.findings.length} finding
              {security.findings.length === 1 ? "" : "s"} to review.
            </p>
          </Card>

          {sorted.length === 0 ? (
            <Card>
              <EmptyState
                icon={ShieldCheck}
                title="No findings"
                description="Nothing to fix — your resource is in great shape."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {sorted.map((f, i) => (
                <SecurityFindingItem key={i} finding={f} />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={sslConfirmOpen}
        onClose={() => setSslConfirmOpen(false)}
        onConfirm={handleRenewSsl}
        title="Renew SSL certificate?"
        description="This will request a fresh certificate from Let's Encrypt and install it. The process usually takes a minute or two."
        confirmLabel="Yes, renew"
      />

      {sslActionId ? (
        <AsyncActionTracker
          actionId={sslActionId}
          label="Renewing SSL certificate"
          onComplete={() => {
            securityQ.refetch()
          }}
          onError={() => {
            securityQ.refetch()
          }}
        />
      ) : null}
    </div>
  )
}

// Keep CardTitle referenced so the layout's title component is reachable
// for future per-section heads.
void CardTitle
