import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Cloud,
  Plus,
  Server,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react"
import { useProject } from "../queries/projects"
import { useInstances } from "../queries/instances"
import { useActions } from "../queries/actions"
import { useActionRequests } from "../queries/action-requests"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Tabs } from "../components/ui/Tabs"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { InstanceCard } from "../components/data/InstanceCard"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { ActionRequestCard } from "../components/data/ActionRequestCard"
import { ActionRequestCreateDialog } from "../components/feedback/ActionRequestCreateDialog"
import { formatRelative, formatDate } from "../lib/utils"
import type { Instance, InstanceType } from "../api/types"

type TabValue = "servers" | "activity" | "settings" | "action-requests"

const instanceTypeOrder: InstanceType[] = ["VPS", "RDS", "REDIS", "STORAGE"]
const instanceTypeLabel: Record<InstanceType, string> = {
  VPS: "Servers",
  RDS: "Databases",
  REDIS: "Caches",
  STORAGE: "Storage",
}

const tabItems: { value: TabValue; label: string; icon: LucideIcon }[] = [
  { value: "servers", label: "Servers", icon: Server },
  { value: "activity", label: "Activity", icon: Activity },
  { value: "action-requests", label: "Action Requests", icon: ClipboardList },
  { value: "settings", label: "Settings", icon: SettingsIcon },
]

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabValue>("servers")

  const projectQ = useProject(id)
  const instancesQ = useInstances({ projectId: id })
  const actionsQ = useActions({ limit: 100 })
  const actionRequestsQ = useActionRequests({ projectId: id })

  if (projectQ.isLoading) return <LoadingPage label="Loading project…" />
  if (projectQ.isError) {
    return (
      <ErrorState
        title="We couldn't load this project"
        error={projectQ.error as Error}
        onRetry={() => projectQ.refetch()}
      />
    )
  }
  if (!projectQ.data) {
    return (
      <ErrorState
        title="This project doesn't exist"
        description="It may have been removed. Head back to your projects to find what you need."
      />
    )
  }

  const project = projectQ.data
  const instances = instancesQ.data ?? []
  const allActions = actionsQ.data?.data ?? []
  const projectInstanceIds = new Set(instances.map((i) => i.id))
  const projectActions = allActions.filter((a) =>
    projectInstanceIds.has(a.instance_id)
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/projects" className="hover:text-fg">
          Projects
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">{project.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Cloud className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-1 text-[0.9375rem] text-fg-muted">
              {project.description}
            </p>
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} items={tabItems} />

      {tab === "servers" ? (
        <ServersTab instances={instances} />
      ) : tab === "activity" ? (
        <ActivityTab actions={projectActions} loading={actionsQ.isLoading} />
      ) : tab === "action-requests" ? (
        <ActionRequestsTab
          projectName={project.name}
          actionRequests={actionRequestsQ.data?.data ?? []}
          loading={actionRequestsQ.isLoading}
        />
      ) : (
        <SettingsTab project={project} />
      )}
    </div>
  )
}

function ServersTab({ instances }: { instances: Instance[] }) {
  if (instances.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Server}
          title="No resources in this project yet"
          description="When a server, database, or storage bucket is added to this project, it'll show up here."
        />
      </Card>
    )
  }

  const grouped = instanceTypeOrder
    .map((type) => ({
      type,
      label: instanceTypeLabel[type],
      items: instances.filter((i) => i.type === type),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.type}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-muted">
            {group.label} · {group.items.length}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((instance) => (
              <InstanceCard key={instance.id} instance={instance} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ActivityTab({
  actions,
  loading,
}: {
  actions: import("../api/types").Action[]
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity in this project</CardTitle>
      </CardHeader>
      {loading ? (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">Loading…</p>
      ) : actions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/50 bg-surface-sunken/50 px-4 py-6 text-center text-sm text-fg-muted">
          No activity yet. Backups, security patches, and certificate renewals
          for this project's resources will show up here.
        </p>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <ActionTimelineItem key={action.id} action={action} showInstance />
          ))}
        </div>
      )}
    </Card>
  )
}

function SettingsTab({ project }: { project: import("../api/types").Project }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <DetailRow label="Name" value={project.name} />
          <DetailRow
            label="Created"
            value={formatDate(project.created_at)}
          />
          {project.description ? (
            <DetailRow label="Description" value={project.description} />
          ) : null}
          {project.total_allocated_ram ? (
            <DetailRow
              label="Allocated RAM"
              value={project.total_allocated_ram}
            />
          ) : null}
          {project.total_storage_capacity ? (
            <DetailRow
              label="Storage capacity"
              value={project.total_storage_capacity}
            />
          ) : null}
          {project.server_ip_addresses ? (
            <DetailRow
              label="Server IPs"
              value={project.server_ip_addresses}
              mono
            />
          ) : null}
          {project.cpu_details ? (
            <DetailRow label="CPU" value={project.cpu_details} />
          ) : null}
          {project.database_driver ? (
            <DetailRow
              label="Database"
              value={`${project.database_driver} ${project.database_version}`}
            />
          ) : null}
          {project.redis_memory ? (
            <DetailRow
              label="Redis memory"
              value={project.redis_memory}
            />
          ) : null}
          {project.instance_type ? (
            <DetailRow
              label="Instance type"
              value={project.instance_type}
              mono
            />
          ) : null}
          {project.billing_info ? (
            <DetailRow
              label="Billing"
              value={project.billing_info}
            />
          ) : null}
        </dl>
      </Card>
      <p className="text-xs text-fg-subtle">
        Last updated {formatRelative(project.created_at)}. Need to change
        something? Email{" "}
        <a
          href="mailto:support@jetimworks.com"
          className="text-primary hover:underline"
        >
          support@jetimworks.com
        </a>
        .
      </p>
    </div>
  )
}

function ActionRequestsTab({
  projectName,
  actionRequests,
  loading,
}: {
  projectName: string
  actionRequests: import("../api/types").ActionRequest[]
  loading: boolean
}) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => setCreateOpen(true)}
        >
          New Request
        </Button>
      </div>
      {loading ? (
        <p className="text-center text-sm text-fg-muted py-6">Loading…</p>
      ) : actionRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No action requests for this project"
            description="Create a request and it'll show up here."
            action={{
              label: "Create request",
              onClick: () => setCreateOpen(true),
              variant: "primary",
              icon: Plus,
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {actionRequests.map((ar) => (
            <ActionRequestCard
              key={ar.id}
              actionRequest={ar}
              showProject
              projectName={projectName}
            />
          ))}
        </div>
      )}
      <ActionRequestCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd
        className={
          mono
            ? "mt-0.5 font-mono text-sm text-fg"
            : "mt-0.5 text-sm text-fg"
        }
      >
        {value}
      </dd>
    </div>
  )
}
