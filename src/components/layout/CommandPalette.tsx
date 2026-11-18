import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { useNavigate } from "react-router-dom"
import {
  ClipboardList,
  Cloud,
  CornerDownLeft,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useProjects } from "../../queries/projects"
import { useInstances } from "../../queries/instances"
import { useConsolePrefs } from "../../hooks/useConsolePrefs"
import { bucketForType, INSTANCE_BUCKETS } from "../../lib/instance-types"
import type { InstanceType } from "../../api/types"
import { cn } from "../../lib/utils"

interface PaletteEntry {
  id: string
  title: string
  subtitle: string
  group: "Pages" | "Projects" | "Servers"
  to: string
  keywords: string
  icon: LucideIcon
}

const PAGE_ENTRIES: PaletteEntry[] = [
  {
    id: "page-dashboard",
    title: "Overview",
    subtitle: "How everything is doing right now",
    group: "Pages",
    to: "/dashboard",
    keywords: "overview dashboard home status summary",
    icon: LayoutDashboard,
  },
  {
    id: "page-instances",
    title: "Infrastructure",
    subtitle: "Your servers, databases, caches, and storage",
    group: "Pages",
    to: "/instances",
    keywords: "instances infrastructure servers databases storage resources",
    icon: Server,
  },
  {
    id: "page-deployments",
    title: "Deployments",
    subtitle: "Sites and services that are live",
    group: "Pages",
    to: "/deployments",
    keywords: "deployments sites live applications",
    icon: Globe,
  },
  {
    id: "page-action-requests",
    title: "Action requests",
    subtitle: "Work you have asked us to do",
    group: "Pages",
    to: "/action-requests",
    keywords: "action requests help work",
    icon: ClipboardList,
  },
  {
    id: "page-support",
    title: "Support",
    subtitle: "Answers and a way to reach a person",
    group: "Pages",
    to: "/support",
    keywords: "support help contact faq",
    icon: LifeBuoy,
  },
  {
    id: "page-account",
    title: "Account",
    subtitle: "Your details, password, and sign out",
    group: "Pages",
    to: "/account",
    keywords: "account profile password settings",
    icon: Users,
  },
]

function bucketLabel(type: InstanceType): string {
  const bucket = bucketForType(type)
  return INSTANCE_BUCKETS.find((b) => b.value === bucket)?.label ?? "Resource"
}

/**
 * ⌘K command palette — the console's global search.
 *
 * It searches the data the app has already fetched (projects and
 * instances), plus the static page list. No new requests: the projects
 * query already runs for the project selector and the instances query
 * already runs on the overview page.
 *
 * Built on a native <dialog> so focus trapping, Escape, and the top-layer
 * stacking come from the platform rather than a new dependency.
 */
export function CommandPalette() {
  const { paletteOpen, openPalette, closePalette } = useConsolePrefs()
  const projectsQ = useProjects()
  const instancesQ = useInstances()
  const navigate = useNavigate()

  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  // Global ⌘K / Ctrl+K opens the palette from anywhere in the console.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        openPalette()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [openPalette])

  // Mirror the context state onto the native dialog.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (paletteOpen && !dialog.open) {
      setQuery("")
      setActiveIndex(0)
      dialog.showModal()
      // Focus the field after the dialog is in the top layer.
      window.requestAnimationFrame(() => inputRef.current?.focus())
    } else if (!paletteOpen && dialog.open) {
      dialog.close()
    }
  }, [paletteOpen])

  const entries = useMemo<PaletteEntry[]>(() => {
    const projects: PaletteEntry[] = (projectsQ.data ?? []).map((p) => ({
      id: `project-${p.id}`,
      title: p.name,
      subtitle: p.description ?? "Project",
      group: "Projects",
      to: `/projects/${p.id}`,
      keywords: `${p.name} ${p.description ?? ""}`.toLowerCase(),
      icon: Cloud,
    }))

    const servers: PaletteEntry[] = (instancesQ.data ?? []).map((i) => ({
      id: `instance-${i.id}`,
      title: i.name,
      subtitle: i.host ?? bucketLabel(i.type),
      group: "Servers",
      to: `/instances/${i.id}`,
      keywords: `${i.name} ${i.host ?? ""} ${i.type} ${i.domain ?? ""}`.toLowerCase(),
      icon: Server,
    }))

    return [...PAGE_ENTRIES, ...projects, ...servers]
  }, [projectsQ.data, instancesQ.data])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries.slice(0, 12)
    return entries
      .filter((entry) =>
        `${entry.title} ${entry.keywords}`.toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [entries, query])

  const groups = useMemo(() => {
    const order: PaletteEntry["group"][] = ["Pages", "Projects", "Servers"]
    return order
      .map((group) => ({
        group,
        items: results.filter((entry) => entry.group === group),
      }))
      .filter((section) => section.items.length > 0)
  }, [results])

  // Flattened order for arrow-key navigation.
  const flat = useMemo(() => groups.flatMap((section) => section.items), [groups])

  // Reset the selection when the query changes, using the same
  // "previous-value" pattern the rest of the app uses — state is safe to
  // read and write during render in React 19.
  const [prevQuery, setPrevQuery] = useState(query)
  if (prevQuery !== query) {
    setPrevQuery(query)
    setActiveIndex(0)
  }

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    )
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const go = (entry: PaletteEntry) => {
    closePalette()
    navigate(entry.to)
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) =>
        flat.length ? (i - 1 + flat.length) % flat.length : 0
      )
    } else if (e.key === "Enter") {
      e.preventDefault()
      const entry = flat[activeIndex]
      if (entry) go(entry)
    }
  }

  let runningIndex = -1

  return (
    <dialog
      ref={dialogRef}
      onClose={closePalette}
      onCancel={closePalette}
      className="mx-auto mt-[8vh] mb-auto w-[calc(100vw-1.5rem)] max-w-xl overflow-hidden rounded-lg border border-border bg-surface p-0 shadow-[var(--shadow-modal)]"
      aria-label="Search the console"
    >
      <div onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search servers, projects, and pages"
            className="h-12 w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-autocomplete="list"
          />
        </div>

        <div
          ref={listRef}
          id="command-palette-results"
          role="listbox"
          className="max-h-[22rem] overflow-y-auto p-2"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-body text-fg-muted">
              Nothing matched — try a server name, an IP address, or a project.
            </p>
          ) : (
            groups.map((section) => (
              <div key={section.group} className="mb-2 last:mb-0">
                <p className="section-label px-3 py-1.5">{section.group}</p>
                {section.items.map((entry) => {
                  runningIndex += 1
                  const index = runningIndex
                  const Icon = entry.icon
                  const isActive = index === activeIndex
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-index={index}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(entry)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                        isActive ? "bg-primary-soft" : "hover:bg-surface-sunken"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-soft-fg" : "text-fg-muted"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {entry.title}
                        </span>
                        <span className="block truncate text-caption text-fg-muted">
                          {entry.subtitle}
                        </span>
                      </span>
                      {isActive ? (
                        <CornerDownLeft
                          className="h-3.5 w-3.5 shrink-0 text-primary-soft-fg"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2 text-micro text-fg-subtle">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </div>
    </dialog>
  )
}

CommandPalette.displayName = "CommandPalette"
