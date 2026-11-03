import { useMemo } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ChevronRight,
  FolderOpen,
  HardDrive,
  HardDriveDownload,
  Server,
  Settings2,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card } from "../components/ui/Card"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { DiskUsagePanel } from "../components/system/DiskUsagePanel"
import { DiskFilesPanel } from "../components/system/DiskFilesPanel"
import { SwapPanel } from "../components/system/SwapPanel"
import { ServiceControlList } from "../components/system/ServiceControlList"
import { useInstance, useInstances } from "../queries/instances"
import {
  useDiskFiles,
  useDiskUsage,
  useServices,
  useSetSwapPath,
  useSwapPath,
  useSwapStatus,
} from "../queries/system"
import { normalizeError } from "../api/errors"
import { resolveServiceName } from "../lib/service-name"
import { baseUnitName } from "../lib/ops-host"
import { pageVariants, reducedVariants } from "../lib/motion"
import type { InstanceType } from "../api/types"

const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REMOTE_RDS: "Remote database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

type Panel = "disk" | "files" | "swap" | "services"

const PANELS: { value: Panel; label: string; icon: typeof HardDrive }[] = [
  { value: "disk", label: "Disk", icon: HardDrive },
  { value: "files", label: "Large files", icon: FolderOpen },
  { value: "swap", label: "Swap", icon: HardDriveDownload },
  { value: "services", label: "Services", icon: Settings2 },
]

/**
 * Read the panel out of the URL hash.
 *
 * The quests link straight to a panel — `/instances/:id/system#swap` — so
 * the hash is what decides where the page opens. An unknown or missing hash
 * opens the disk report, which is the panel that answers the most questions.
 */
function panelFromHash(hash: string): Panel {
  const value = hash.replace(/^#/, "")
  const match = PANELS.find((panel) => panel.value === value)
  return match ? match.value : "disk"
}

/**
 * The system toolkit.
 *
 * Everything on this page is read over SSH, so it needs a server. The reads
 * are cheap — a `df`, a `find`, a `swapon --show`, a `systemctl list-units` —
 * but each one opens its own session, so only the panel on screen is
 * fetched. Switching panels reads the next one; the answers are cached, so
 * going back is instant.
 */
export function InstanceSystemPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)

  // The panel IS the hash. Deriving it rather than mirroring it in state
  // means a quest link, a shared URL and the tab control can never point at
  // different panels.
  const panel = panelFromHash(location.hash)

  const instance = instanceQ.data ?? null
  const isVps = instance?.type === "VPS"
  const canReadHost = isVps && Boolean(instance?.host)

  const diskQ = useDiskUsage(id, { enabled: canReadHost && panel === "disk" })
  const diskFilesQ = useDiskFiles(id, {
    enabled: canReadHost && panel === "files",
  })
  const swapPath = useSwapPath(id)
  const setSwapPath = useSetSwapPath(id)
  const swapQ = useSwapStatus(id, {
    enabled: canReadHost && panel === "swap",
    path: swapPath,
  })
  const servicesQ = useServices(id, {
    enabled: canReadHost && panel === "services",
  })

  // The children this host parents. A host-wide unit stopped on this host
  // takes them down with it, and the operator is told before they press the
  // button rather than after.
  //
  // The list endpoint has no `parent_id` filter — it answers with every
  // instance the caller owns — so the children are picked out here, on the
  // `parent_id` column the response already carries.
  const childrenQ = useInstances(undefined, { enabled: canReadHost })
  const childCount = useMemo(
    () =>
      (childrenQ.data ?? []).filter((child) => child.parent_id === id).length,
    [childrenQ.data, id]
  )

  const selectPanel = (value: Panel) => {
    navigate(
      { pathname: location.pathname, hash: value === "disk" ? "" : `#${value}` },
      { replace: true }
    )
  }

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instance) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }

  const appUnit = isVps
    ? baseUnitName(resolveServiceName(instance))
    : null

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="enter"
      variants={reduceMotion ? reducedVariants : pageVariants}
    >
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/instances" className="hover:text-fg">
          Infrastructure
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to={`/instances/${instance.id}`} className="hover:text-fg">
          {instance.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">System</span>
      </nav>

      <header>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          System toolkit
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Where the disk space went, whether the host has swap, and which
          systemd units it is running. Everything here is read over SSH from{" "}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
            {instance.host ?? instance.name}
          </code>
          .
        </p>
      </header>

      {!canReadHost ? (
        <Card>
          <EmptyState
            icon={Server}
            title="The system toolkit is only available on servers"
            description={
              isVps
                ? "This server has no host address on file, so there is nothing to connect to. Add one in the instance settings."
                : `This is a ${typeLabel[instance.type].toLowerCase()} resource — the toolkit reads a real server over SSH.`
            }
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto pb-1">
            <SegmentedControl
              ariaLabel="System panel"
              value={panel}
              onChange={selectPanel}
              options={PANELS}
            />
          </div>

          {panel === "disk" ? (
            <DiskUsagePanel
              report={diskQ.data}
              loading={diskQ.isLoading}
              error={diskQ.isError ? normalizeError(diskQ.error) : null}
              onRetry={() => diskQ.refetch()}
            />
          ) : null}

          {panel === "files" ? (
            <DiskFilesPanel
              response={diskFilesQ.data}
              loading={diskFilesQ.isLoading}
              error={diskFilesQ.isError ? normalizeError(diskFilesQ.error) : null}
              onRetry={() => diskFilesQ.refetch()}
            />
          ) : null}

          {panel === "swap" ? (
            <SwapPanel
              instanceId={instance.id}
              status={swapQ.data}
              loading={swapQ.isLoading}
              error={swapQ.isError ? normalizeError(swapQ.error) : null}
              onRetry={() => swapQ.refetch()}
              canCreate={isVps}
              swapPath={swapPath}
              onSwapPathKnown={setSwapPath}
            />
          ) : null}

          {panel === "services" ? (
            <ServiceControlList
              instanceId={instance.id}
              units={servicesQ.data ?? []}
              loading={servicesQ.isLoading}
              error={servicesQ.isError ? normalizeError(servicesQ.error) : null}
              onRetry={() => servicesQ.refetch()}
              appUnit={appUnit}
              childCount={childCount}
              canControl={isVps}
            />
          ) : null}
        </>
      )}
    </motion.div>
  )
}

InstanceSystemPage.displayName = "InstanceSystemPage"
