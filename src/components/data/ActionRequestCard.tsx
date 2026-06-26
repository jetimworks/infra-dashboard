import { Link } from "react-router-dom"
import { ClipboardList, Database, Folder, Server } from "lucide-react"
import { motion } from "framer-motion"
import { Card } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { formatRelative } from "../../lib/utils"
import { listItem } from "../../lib/motion"
import type { ActionRequest, ActionRequestStatus, InstanceType } from "../../api/types"

const statusConfig: Record<
  ActionRequestStatus,
  { tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info"; label: string }
> = {
  OPEN: { tone: "primary", label: "Open" },
  IN_PROGRESS: { tone: "warning", label: "In Progress" },
  RESOLVED: { tone: "success", label: "Resolved" },
  CLOSED: { tone: "neutral", label: "Closed" },
}

const instanceTypeIcon: Record<InstanceType, typeof Server> = {
  VPS: Server,
  RDS: Database,
  REDIS: Server,
  STORAGE: Folder,
}

interface ActionRequestCardProps {
  actionRequest: ActionRequest
  showProject?: boolean
  showInstance?: boolean
  projectName?: string
  instanceName?: string
  instanceType?: InstanceType
}

export function ActionRequestCard({
  actionRequest,
  showProject,
  showInstance,
  projectName,
  instanceName,
  instanceType,
}: ActionRequestCardProps) {
  const status = statusConfig[actionRequest.status]
  const Icon = instanceType ? instanceTypeIcon[instanceType] : ClipboardList

  return (
    <motion.div variants={listItem}>
      <Link to={`/action-requests/${actionRequest.id}`}>
        <Card interactive padding="sm" className="group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 shrink-0 text-fg-muted group-hover:text-primary transition-colors">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-fg truncate group-hover:text-primary transition-colors">
                    {actionRequest.title}
                  </h3>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                {actionRequest.description ? (
                  <p className="mt-1 text-sm text-fg-muted line-clamp-2">
                    {actionRequest.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  {showProject && projectName ? (
                    <span>
                      Project:{" "}
                      <span className="text-fg-muted">{projectName}</span>
                    </span>
                  ) : null}
                  {showInstance && instanceName ? (
                    <span>
                      Instance:{" "}
                      <span className="text-fg-muted">{instanceName}</span>
                    </span>
                  ) : null}
                  <span>{formatRelative(actionRequest.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
