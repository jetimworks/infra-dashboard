import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  ChevronRight,
  ChevronUp,
  Circle,
  Download,
  FileText,
  Folder,
  GitBranch,
  Link2,
  RefreshCw,
  Save,
  Server,
  Upload,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Textarea } from "../components/ui/Input"
import { StatusPill } from "../components/ui/StatusPill"
import { LoadingPage, LoadingBlock } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { WarningBlock } from "../components/system/WarningBlock"
import { AppDirectoryCard } from "../components/system/AppDirectoryCard"
import { BranchControl } from "../components/system/BranchControl"
import { ReleaseOutputBlock } from "../components/releases/ReleaseOutputBlock"
import {
  useAppDirectory,
  useDirectoryListing,
  useFileContent,
  useGitPull,
  useGitPush,
  useGitRevert,
  useGitStatus,
  useGitUnstage,
  useInstance,
  useInstanceEnv,
  useSetAppDirectory,
  useWriteEnv,
  useWriteFile,
} from "../queries/instances"
import { normalizeError } from "../api/errors"
import { cn, formatBytes, formatRelative } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import type { FileEntry, GitStatus, Instance, InstanceType } from "../api/types"

/**
 * The host's filesystem and the repository the release pipeline deploys from.
 *
 * Two rules shape this page:
 *
 *   1. The platform reports what is on the host and lets an operator change a
 *      file's CONTENT. It does not delete, rename or move anything — there is
 *      no delete button anywhere on this page, and there will not be one.
 *   2. The backend's own words are the diagnosis. A rejected path, a diverged
 *      branch, a missing deploy key — each of those messages says more than a
 *      paraphrase would, so they are rendered verbatim.
 */

const MAX_EDITABLE_BYTES = 2 * 1024 * 1024

const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REMOTE_RDS: "Remote database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

function joinPath(base: string, name: string): string {
  if (base === "/") return `/${name}`
  return `${base.replace(/\/+$/, "")}/${name}`
}

export function InstanceFilesPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  const appDirQ = useAppDirectory(id)

  // The directory the browser is showing. `undefined` means "the app
  // directory" — the backend resolves it, and the response echoes the
  // normalised path back.
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined)
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [buffer, setBuffer] = useState("")
  const [loadedContent, setLoadedContent] = useState("")
  const [saveWarnings, setSaveWarnings] = useState<string[]>([])
  const [creatingEnv, setCreatingEnv] = useState(false)

  // The .env shortcut: `?env=1` opens the app's environment file directly.
  const envShortcut = searchParams.get("env") === "1"

  const listingQ = useDirectoryListing(id, currentPath)
  const contentQ = useFileContent(id, selectedPath)
  const envQ = useInstanceEnv(id, envShortcut)
  const gitQ = useGitStatus(id)

  const setAppDir = useSetAppDirectory()
  const writeFile = useWriteFile()
  const writeEnv = useWriteEnv()
  const pull = useGitPull()
  const push = useGitPush()

  // The editor's buffer is mirrored in a ref so the content query can decide
  // whether to overwrite it. A refetch must not silently discard what the
  // operator is in the middle of typing.
  const editor = useRef({
    path: undefined as string | undefined,
    buffer: "",
    loaded: "",
  })

  // The one document the editor is bound to: the .env when the shortcut is
  // open, otherwise the file selected from the list.
  const showEnv = envShortcut || creatingEnv
  const activeDoc = showEnv ? envQ.data : contentQ.data

  useEffect(() => {
    const loaded = activeDoc
    if (!loaded) return
    const state = editor.current
    const pathChanged = state.path !== loaded.path
    const dirty = state.buffer !== state.loaded
    if (!pathChanged && dirty) return
    state.path = loaded.path
    state.buffer = loaded.content
    state.loaded = loaded.content
    setBuffer(loaded.content)
    setLoadedContent(loaded.content)
  }, [activeDoc])

  // The application directory IS the file browser's root. Changing it while
  // the operator is inside a subdirectory of the old root leaves the browser
  // on a path that may not exist, so the browser goes back to the root. The
  // ref guard means this fires on a real change only, not on the first load.
  const appDirPath = appDirQ.data?.path
  const lastAppDirPath = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!appDirPath) return
    if (lastAppDirPath.current && lastAppDirPath.current !== appDirPath) {
      setCurrentPath(undefined)
      setSelectedPath(undefined)
    }
    lastAppDirPath.current = appDirPath
  }, [appDirPath])

  const dirty = buffer !== loadedContent

  const instance = instanceQ.data
  const isVps = instance?.type === "VPS"

  // Leaving the .env shortcut closes the env panel and opens whatever the
  // operator picked instead.
  const leaveEnvShortcut = () => {
    if (envShortcut) setSearchParams({}, { replace: true })
    setCreatingEnv(false)
  }

  const openDirectory = (path: string) => {
    leaveEnvShortcut()
    setCurrentPath(path)
  }

  const openFile = (entry: FileEntry) => {
    leaveEnvShortcut()
    setSaveWarnings([])
    setSelectedPath(joinPath(listingQ.data?.path ?? "/", entry.name))
    // Reset the editor for the new path. Without this the buffer would still
    // hold the previous file's text while the new one loads, and Save would
    // be one click away from writing it to the wrong path.
    editor.current = { path: undefined, buffer: "", loaded: "" }
    setBuffer("")
    setLoadedContent("")
  }

  const handleBuffer = (value: string) => {
    setBuffer(value)
    editor.current.buffer = value
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
  if (!isVps) {
    return (
      <div className="space-y-6">
        <Breadcrumb id={instance.id} name={instance.name} />
        <Card>
          <EmptyState
            icon={Server}
            title="Files are only available on servers"
            description={`This is a ${typeLabel[instance.type].toLowerCase()} resource — there's no host filesystem to browse.`}
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      </div>
    )
  }

  const listing = listingQ.data
  // A 404 on the .env is not a dead end — it means the file has not been
  // created yet, and the viewer offers to create it.
  const envMissing =
    envShortcut &&
    !creatingEnv &&
    (envQ.isError
      ? normalizeError(envQ.error).status === 404
      : !envQ.isLoading && !envQ.data)

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="enter"
      variants={reduceMotion ? reducedVariants : pageVariants}
    >
      <Breadcrumb id={instance.id} name={instance.name} />

      <header>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          Files
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Browse the host, edit a file's contents, and pull or push the
          repository the release pipeline deploys from.
        </p>
      </header>

      <AppDirectoryCard
        directory={appDirQ.data}
        loading={appDirQ.isLoading}
        error={appDirQ.isError ? normalizeError(appDirQ.error) : null}
        onSave={(path) => setAppDir.mutateAsync({ id: instance.id, path })}
        saving={setAppDir.isPending}
        saveWarnings={setAppDir.data?.warnings ?? []}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <DirectoryPanel
          listing={listing}
          loading={listingQ.isLoading}
          error={listingQ.isError ? normalizeError(listingQ.error) : null}
          onRetry={() => listingQ.refetch()}
          onRefresh={() => listingQ.refetch()}
          onOpenDirectory={openDirectory}
          onOpenFile={openFile}
          selectedPath={selectedPath}
        />

        <FileViewer
          envShortcut={envShortcut}
          envMissing={envMissing}
          creatingEnv={creatingEnv}
          onStartCreateEnv={() => {
            setCreatingEnv(true)
            setSaveWarnings([])
            editor.current = { path: undefined, buffer: "", loaded: "" }
            setBuffer("")
            setLoadedContent("")
          }}
          env={envShortcut ? envQ.data : undefined}
          envLoading={envShortcut && envQ.isLoading}
          envError={
            envShortcut && envQ.isError ? normalizeError(envQ.error) : null
          }
          file={contentQ.data}
          fileLoading={contentQ.isLoading}
          fileError={contentQ.isError ? normalizeError(contentQ.error) : null}
          onRetry={() => (envShortcut ? envQ.refetch() : contentQ.refetch())}
          buffer={buffer}
          onBufferChange={handleBuffer}
          dirty={dirty}
          warnings={saveWarnings}
          writeError={
            writeFile.isError || writeEnv.isError
              ? normalizeError(writeFile.isError ? writeFile.error : writeEnv.error)
                  .message
              : null
          }
          onSave={() => {
            setSaveWarnings([])
            // Clear the previous failure so a stale error does not sit under
            // the editor after the next save succeeds.
            writeFile.reset()
            writeEnv.reset()
            if (envShortcut || creatingEnv) {
              writeEnv.mutate(
                { id: instance.id, content: buffer },
                {
                  onSuccess: (result) => {
                    setSaveWarnings(result.warnings ?? [])
                    // The buffer we just wrote IS the file's new content, so
                    // the editor is no longer dirty. Without this the "Unsaved
                    // changes" pill stays on after a successful save.
                    editor.current.loaded = buffer
                    setLoadedContent(buffer)
                    setCreatingEnv(false)
                  },
                }
              )
              return
            }
            if (!selectedPath) return
            writeFile.mutate(
              { id: instance.id, path: selectedPath, content: buffer },
              {
                onSuccess: (result) => {
                  setSaveWarnings(result.warnings ?? [])
                  editor.current.loaded = buffer
                  setLoadedContent(buffer)
                },
              }
            )
          }}
          saving={writeFile.isPending || writeEnv.isPending}
        />
      </div>

      <GitPanel
        status={gitQ.data}
        loading={gitQ.isLoading}
        error={gitQ.isError ? normalizeError(gitQ.error) : null}
        instance={instance}
        pull={pull}
        push={push}
      />
    </motion.div>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
      <Link to="/instances" className="hover:text-fg">
        Infrastructure
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <Link to={`/instances/${id}`} className="hover:text-fg">
        {name}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <span className="font-medium text-fg">Files</span>
    </nav>
  )
}

function DirectoryPanel({
  listing,
  loading,
  error,
  onRetry,
  onRefresh,
  onOpenDirectory,
  onOpenFile,
  selectedPath,
}: {
  listing: import("../api/types").DirListing | undefined
  loading: boolean
  error: { message: string } | null
  onRetry: () => void
  onRefresh: () => void
  onOpenDirectory: (path: string) => void
  onOpenFile: (entry: FileEntry) => void
  selectedPath: string | undefined
}) {
  const entries = listing?.entries ?? []
  const parent = listing?.parent ?? "/"

  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-fg-muted" aria-hidden />
          <CardTitle className="text-base">Files</CardTitle>
          {entries.length > 0 ? (
            <span className="text-xs text-fg-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={RefreshCw}
          onClick={onRefresh}
          isLoading={loading}
          aria-label="Refresh the directory listing"
        >
          Refresh
        </Button>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-1 border-y border-border/30 px-4 py-2">
        <PathBreadcrumb
          path={listing?.path ?? "/"}
          onNavigate={onOpenDirectory}
        />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={ChevronUp}
          onClick={() => onOpenDirectory(parent)}
          disabled={parent === "/"}
          aria-label="Go up one directory"
        >
          Up
        </Button>
      </div>

      {error ? (
        <div className="px-4 pb-4">
          <ErrorState
            title="Couldn't list this directory"
            description={error.message}
            onRetry={onRetry}
            className="py-6"
          />
        </div>
      ) : loading && !listing ? (
        <div className="px-4 pb-4">
          <LoadingBlock label="Listing files…" className="py-6" />
        </div>
      ) : entries.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState
            icon={Folder}
            tone="info"
            title="This directory is empty"
            description="Nothing here yet on this host."
            className="py-6"
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {entries.map((entry) => (
            <DirectoryEntry
              key={entry.name}
              entry={entry}
              active={selectedPath === joinPath(listing?.path ?? "/", entry.name)}
              onOpen={() => {
                if (entry.type === "directory") {
                  onOpenDirectory(joinPath(listing?.path ?? "/", entry.name))
                  return
                }
                // A device, a FIFO or a socket is not a file. It is rendered
                // as a name and a size and never opened.
                if (entry.type === "other") return
                onOpenFile(entry)
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

function PathBreadcrumb({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (path: string) => void
}) {
  const segments = path.split("/").filter(Boolean)
  return (
    <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-xs">
      <button
        type="button"
        onClick={() => onNavigate("/")}
        className={cn(
          "rounded px-1 py-0.5 font-mono transition-colors hover:bg-surface-sunken hover:text-fg",
          segments.length === 0 ? "font-medium text-fg" : "text-fg-muted"
        )}
      >
        /
      </button>
      {segments.map((segment, index) => {
        const target = `/${segments.slice(0, index + 1).join("/")}`
        const isLast = index === segments.length - 1
        return (
          <span key={target} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3 w-3 text-fg-subtle" aria-hidden />
            <button
              type="button"
              onClick={() => onNavigate(target)}
              className={cn(
                "truncate rounded px-1 py-0.5 font-mono transition-colors hover:bg-surface-sunken hover:text-fg",
                isLast ? "font-medium text-fg" : "text-fg-muted"
              )}
            >
              {segment}
            </button>
          </span>
        )
      })}
    </nav>
  )
}

function DirectoryEntry({
  entry,
  active,
  onOpen,
}: {
  entry: FileEntry
  active: boolean
  onOpen: () => void
}) {
  const isDirectory = entry.type === "directory"
  // "other" is everything the backend could not map onto a file, a directory
  // or a symlink — a character device, a block device, a FIFO, a socket. It
  // has a name and a size, and it is neither openable nor writable: the
  // backend answers 409 for it on both the read and the write path.
  const isOther = entry.type === "other"
  // The listing already knows the size, so a file over the cap is never
  // opened — the backend would answer 413 anyway.
  const tooLarge =
    !isDirectory && !isOther && entry.size_bytes > MAX_EDITABLE_BYTES
  const Icon = isDirectory
    ? Folder
    : entry.type === "symlink"
      ? Link2
      : isOther
        ? Circle
        : FileText
  const locked = tooLarge || isOther

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        aria-pressed={active}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150",
          active
            ? "bg-primary-soft text-primary"
            : "text-fg hover:bg-surface-sunken",
          locked && "cursor-not-allowed opacity-60 hover:bg-transparent"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {active ? (
            <span
              className="inline-block h-4 w-0.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          ) : null}
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              active ? "text-primary" : "text-fg-subtle"
            )}
            aria-hidden
          />
          <span className="truncate font-mono text-[0.8125rem]">{entry.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
          {tooLarge ? (
            <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              Too large
            </span>
          ) : (
            <span className="tabular-nums">
              {isDirectory ? "—" : formatBytes(entry.size_bytes)}
            </span>
          )}
          {isOther ? (
            <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              Not a file
            </span>
          ) : null}
          <span aria-hidden>·</span>
          <span className="font-mono">{entry.mode}</span>
        </span>
      </button>
    </li>
  )
}

function FileViewer({
  envShortcut,
  envMissing,
  creatingEnv,
  onStartCreateEnv,
  env,
  envLoading,
  envError,
  file,
  fileLoading,
  fileError,
  onRetry,
  buffer,
  onBufferChange,
  dirty,
  warnings,
  writeError,
  onSave,
  saving,
}: {
  envShortcut: boolean
  envMissing: boolean
  creatingEnv: boolean
  onStartCreateEnv: () => void
  env: import("../api/types").FileContent | undefined
  envLoading: boolean
  envError: { message: string } | null
  file: import("../api/types").FileContent | undefined
  fileLoading: boolean
  fileError: { message: string } | null
  onRetry: () => void
  buffer: string
  onBufferChange: (value: string) => void
  dirty: boolean
  warnings: string[]
  writeError: string | null
  onSave: () => void
  saving: boolean
}) {
  const showEnv = envShortcut || creatingEnv
  const loaded = showEnv ? env : file
  const loading = showEnv ? envLoading : fileLoading
  const error = showEnv ? envError : fileError

  // A binary file's content is withheld on purpose. Opening it would let a
  // GET → PUT round trip write an empty file over a binary one.
  const binary = Boolean(loaded?.binary)
  // There is nothing to save while the .env does not exist yet — the Create
  // button is the only way forward from that state. A binary file is never
  // savable either: its content is withheld, so a save would write an empty
  // file over it.
  const canSave = envMissing || binary ? false : showEnv ? true : Boolean(file)
  const title = showEnv
    ? env?.path ?? ".env"
    : file?.path?.split("/").pop() ?? "No file selected"

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-mono text-sm text-fg">{title}</span>
          {loaded ? (
            <>
              <StatusPill
                status={
                  modeWarning(loaded.mode, loaded.path) ? "warning" : "neutral"
                }
                size="sm"
                label={loaded.mode}
              />
              <StatusPill
                status="neutral"
                size="sm"
                label={formatBytes(loaded.size_bytes)}
              />
              <span className="text-xs text-fg-muted">
                {formatRelative(loaded.modified_at)}
              </span>
            </>
          ) : null}
          {dirty ? (
            <StatusPill status="warning" size="sm" label="Unsaved changes" />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSave ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Save}
              onClick={onSave}
              isLoading={saving}
              disabled={!dirty && !creatingEnv}
            >
              Save
            </Button>
          ) : null}
        </div>
      </div>

      <div className="px-4 pt-3">
        {warnings.length > 0 ? (
          <WarningBlock warnings={warnings} className="mb-3" />
        ) : null}
        {writeError ? (
          <p className="mb-3 text-xs text-danger-fg">{writeError}</p>
        ) : null}
      </div>

      <div className="min-h-[24rem] flex-1 px-4 pb-4">
        {envMissing ? (
          <EmptyState
            icon={FileText}
            tone="warning"
            title="No .env file yet"
            description="There is no .env in the application directory. Create one here — it is written with mode 600, readable only by its owner."
            action={{
              label: "Create .env",
              onClick: onStartCreateEnv,
              icon: FileText,
            }}
            className="py-12"
          />
        ) : showEnv && creatingEnv ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              This will create a new <code className="font-mono">.env</code> in
              the application directory.
            </p>
            <Textarea
              value={buffer}
              onChange={(e) => onBufferChange(e.target.value)}
              rows={24}
              className="font-mono text-[0.8125rem]"
              spellCheck={false}
            />
          </div>
        ) : !showEnv && !file && !fileLoading && !fileError ? (
          <EmptyState
            icon={FileText}
            title="Pick a file from the list"
            description="Every row shows the size, the permission bits and when the file was last modified. A file's contents open here, and can be edited and saved."
            className="py-12"
          />
        ) : error ? (
          <ErrorState
            title="Couldn't read this file"
            description={error.message}
            onRetry={onRetry}
            className="py-8"
          />
        ) : loading && !loaded ? (
          <LoadingBlock label="Reading the file…" className="py-12" />
        ) : binary ? (
          <EmptyState
            icon={FileText}
            tone="warning"
            title="This file is binary"
            description={`${file?.path ?? "This file"} is not valid text, so its contents are withheld. It is reported, but it cannot be edited here.`}
            className="py-12"
          />
        ) : loaded ? (
          <Textarea
            value={buffer}
            onChange={(e) => onBufferChange(e.target.value)}
            rows={24}
            className="font-mono text-[0.8125rem]"
            spellCheck={false}
          />
        ) : null}
      </div>

      <p className="border-t border-border/40 px-4 py-2.5 text-[11px] text-fg-subtle">
        This page can change a file's contents. It cannot delete, rename or
        move anything — removing something from the host is a deliberate act
        done by hand.
      </p>
    </Card>
  )
}

/**
 * True when a file's permissions are broader than they need to be.
 *
 * A .env readable by other accounts on the host is a real problem, and the
 * write response says so in words — this is the badge that says it first.
 */
function modeWarning(mode: string, path: string): boolean {
  if (!path.endsWith(".env")) return false
  const parsed = Number.parseInt(mode, 8)
  if (Number.isNaN(parsed)) return false
  return (parsed & 0o077) !== 0
}

/**
 * Git's two-character status codes, as they appear in `git status --porcelain`.
 * `?` is untracked; `!` is ignored and never listed here.
 */
const GIT_STATUS_CHARS = new Set(["M", "A", "D", "R", "C", "U", "T", "?", "!"])

/** The backend refuses more than this many paths per unstage or revert. */
const MAX_GIT_PATHS = 200

interface GitChange {
  /** The entry exactly as the backend sent it; the selection key. */
  line: string
  /** The repo-relative path. Everything after the status, never split. */
  path: string
  /** Git's XY code, padded so the columns line up. Empty for a bare path. */
  code: string
  /** True when the index holds a change to this path. */
  staged: boolean
}

/**
 * Reads one entry of `dirty`.
 *
 * The backend trims the LEADING space of the porcelain line, so an unstaged
 * change arrives as "M path" (the Y column) and a staged one as "M  path"
 * (X column, then a space that was already in the path's column). Both are
 * read by position. A path may contain spaces, so nothing is split on
 * whitespace.
 *
 * A rename's orphaned old name has no status at all. It comes back as a
 * bare path and is shown as one.
 */
function parseGitChange(line: string): GitChange {
  const x = line.charAt(0)
  const y = line.charAt(1)
  const z = line.charAt(2)

  if (GIT_STATUS_CHARS.has(x) && y === " " && z !== " ") {
    // Unstaged: the leading space was trimmed, so the status is the Y column.
    return { line, path: line.slice(2), code: ` ${x}`, staged: false }
  }
  if (GIT_STATUS_CHARS.has(x) && y === " " && z === " ") {
    // Staged only: X is set, Y is a space.
    return { line, path: line.slice(3), code: `${x} `, staged: true }
  }
  if (GIT_STATUS_CHARS.has(x) && GIT_STATUS_CHARS.has(y) && z === " ") {
    // Both columns set ("MM", "AM"), or untracked ("??", never staged).
    return {
      line,
      path: line.slice(3),
      code: `${x}${y}`,
      staged: x !== "?",
    }
  }
  return { line, path: line, code: "", staged: false }
}

/**
 * The changed-file list, one entry per line.
 *
 * With `onToggle` each row gets a checkbox; without it the list is read-only
 * (the push form shows what is about to be committed this way).
 */
function GitChangeList({
  changes,
  className,
  selected,
  onToggle,
  selectionFull,
}: {
  changes: GitChange[]
  className?: string
  selected?: Set<string>
  onToggle?: (line: string) => void
  selectionFull?: boolean
}) {
  return (
    <ul
      className={cn(
        "overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.8125rem] text-fg",
        className
      )}
    >
      {changes.map((change, index) => {
        const label = (
          <>
            <span className="shrink-0 whitespace-pre text-fg-muted">
              {change.code || "·"}
            </span>
            <span className="min-w-0 whitespace-pre-wrap break-all">
              {change.path}
            </span>
          </>
        )
        return (
          <li
            key={`${change.line}-${index}`}
            className="flex items-start gap-2"
          >
            {onToggle ? (
              <label className="flex min-w-0 cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer"
                  checked={selected?.has(change.line) ?? false}
                  disabled={
                    selectionFull && !(selected?.has(change.line) ?? false)
                  }
                  onChange={() => onToggle(change.line)}
                  aria-label={`Select ${change.path}`}
                />
                {label}
              </label>
            ) : (
              label
            )}
          </li>
        )
      })}
    </ul>
  )
}

function GitPanel({
  status,
  loading,
  error,
  instance,
  pull,
  push,
}: {
  status: GitStatus | undefined
  loading: boolean
  error: { message: string } | null
  instance: Instance
  pull: ReturnType<typeof useGitPull>
  push: ReturnType<typeof useGitPush>
}) {
  const instanceId = instance.id
  const unstage = useGitUnstage()
  const revert = useGitRevert()
  const [showPushForm, setShowPushForm] = useState(false)
  const [message, setMessage] = useState("")
  const [pickedLines, setPickedLines] = useState<Set<string>>(() => new Set())
  const [confirmRevert, setConfirmRevert] = useState(false)

  const dirty = status?.dirty ?? []
  const changes = dirty.map(parseGitChange)
  const canPush = message.trim().length > 0

  // Selection survives only while its entry is still in the change list. A
  // stale pick is dropped at render time rather than by an effect.
  const dirtyKey = dirty.join("\n")
  const selected = useMemo(() => {
    const present = new Set(dirtyKey ? dirtyKey.split("\n") : [])
    return new Set([...pickedLines].filter((line) => present.has(line)))
  }, [dirtyKey, pickedLines])

  const selectedChanges = changes.filter((change) => selected.has(change.line))
  const selectedPaths = selectedChanges.map((change) => change.path)
  const selectedStagedPaths = selectedChanges
    .filter((change) => change.staged)
    .map((change) => change.path)
  const selectionFull = selected.size >= MAX_GIT_PATHS
  const actionsBusy = unstage.isPending || revert.isPending

  const toggleLine = (line: string) => {
    const next = new Set(selected)
    if (next.has(line)) {
      next.delete(line)
    } else if (next.size < MAX_GIT_PATHS) {
      next.add(line)
    }
    setPickedLines(next)
  }

  const closePushForm = () => {
    setShowPushForm(false)
    setMessage("")
  }

  const onBranch = status ? status.head_branch === status.branch : true
  const detached = status?.head_branch === "HEAD"

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Git</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            The repository in the application directory. Pull and push move its
            HEAD — if a release is running, wait for it to finish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status ? (
            <>
              <StatusPill
                status="neutral"
                size="sm"
                label={status.branch}
              />
              <StatusPill
                status="neutral"
                size="sm"
                label={status.sha.slice(0, 8)}
              />
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            leftIcon={Download}
            onClick={() =>
              // No branch is sent. The backend pulls the selected branch.
              pull.mutate({ id: instanceId })
            }
            isLoading={pull.isPending}
            disabled={!status}
          >
            Pull
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Upload}
            onClick={() => setShowPushForm((open) => !open)}
            disabled={!status}
          >
            Push
          </Button>
        </div>
      </CardHeader>

      {/* The branch control sits OUTSIDE the repository-state conditional: an
          unreachable host is exactly when an operator wants to change the
          branch, and the state cannot be read then. */}
      <div className="mb-4">
        <BranchControl instance={instance} effectiveBranch={status?.branch} />
      </div>

      {error ? (
        <ErrorState
          title="Couldn't read the repository state"
          description={error.message}
          className="py-6"
        />
      ) : loading && !status ? (
        <LoadingBlock label="Reading the repository…" className="py-4" />
      ) : status ? (
        <div className="space-y-4">
          <p className="text-xs text-fg-muted">
            <code className="font-mono text-fg">{status.repo_path}</code>
          </p>

          {!onBranch ? (
            <WarningBlock
              title="The repository is not on the selected branch"
              warnings={[
                `The repository is ${
                  detached ? "on a detached HEAD" : `on ${status.head_branch}`
                }, not ${status.branch}. Pull and push will check out ${
                  status.branch
                }. Unstage and revert will refuse until the repository is back on ${
                  status.branch
                }: pull, or check it out on the host.`,
              ]}
            />
          ) : null}

          {status.warnings.length > 0 ? (
            <WarningBlock warnings={status.warnings} />
          ) : null}

          {dirty.length === 0 ? (
            <p className="text-sm text-fg-muted">
              The working tree is clean — nothing to commit.
            </p>
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  {dirty.length} {dirty.length === 1 ? "change" : "changes"}
                  {selected.size > 0 ? ` · ${selected.size} selected` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      unstage.mutate({
                        id: instanceId,
                        paths: selectedStagedPaths,
                      })
                    }
                    isLoading={unstage.isPending}
                    disabled={selectedStagedPaths.length === 0 || actionsBusy}
                  >
                    Unstage
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setConfirmRevert(true)}
                    disabled={selectedPaths.length === 0 || actionsBusy}
                  >
                    Revert
                  </Button>
                </div>
              </div>
              <GitChangeList
                changes={changes}
                className="max-h-64"
                selected={selected}
                onToggle={toggleLine}
                selectionFull={selectionFull}
              />
              <p className="mt-2 text-xs text-fg-subtle">
                Unstage takes a staged file out of the index and keeps its
                content. Revert discards uncommitted changes. A push stages every
                untracked, non-ignored file, so this list is what gets committed.
              </p>
            </div>
          )}

          {unstage.isError ? (
            <ErrorState
              title="Couldn't unstage"
              description={normalizeError(unstage.error).message}
              className="py-6"
            />
          ) : null}
          {unstage.data?.warnings?.length ? (
            <WarningBlock warnings={unstage.data.warnings} />
          ) : null}

          {revert.isError ? (
            <ErrorState
              title="Couldn't revert"
              description={normalizeError(revert.error).message}
              className="py-6"
            />
          ) : null}
          {revert.data ? (
            <div className="space-y-3 rounded-md bg-info-soft p-4 text-info-fg ring-1 ring-inset ring-info/20">
              <p className="text-sm font-semibold">
                Restored {revert.data.restored.length}{" "}
                {revert.data.restored.length === 1 ? "file" : "files"} to HEAD
              </p>
              {revert.data.restored.length > 0 ? (
                <ul className="max-h-32 overflow-auto font-mono text-[0.8125rem]">
                  {revert.data.restored.map((path) => (
                    <li key={path} className="whitespace-pre-wrap break-all">
                      {path}
                    </li>
                  ))}
                </ul>
              ) : null}
              {revert.data.skipped.length > 0 ? (
                <>
                  <p className="text-sm">
                    Skipped {revert.data.skipped.length}: HEAD does not have
                    these, so nothing was discarded. Nothing has been deleted
                    either. Remove them on the host or through the file manager
                    if that is what you want.
                  </p>
                  <ul className="max-h-32 overflow-auto font-mono text-[0.8125rem]">
                    {revert.data.skipped.map((path) => (
                      <li key={path} className="whitespace-pre-wrap break-all">
                        {path}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
          {revert.data?.warnings?.length ? (
            <WarningBlock warnings={revert.data.warnings} />
          ) : null}

          {showPushForm ? (
            <div className="space-y-3 rounded-md border border-border/40 bg-surface-sunken p-4">
              <p className="text-sm font-medium text-fg">Commit message</p>
              {changes.length > 0 ? (
                <GitChangeList
                  changes={changes}
                  className="max-h-32 rounded bg-surface text-[0.75rem] text-fg-muted"
                />
              ) : null}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="font-mono text-[0.8125rem]"
                spellCheck={false}
                hint="Required. The message is sent as-is — it is committed verbatim."
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePushForm}
                  disabled={push.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Upload}
                  onClick={() =>
                    push.mutate(
                      // No branch is sent. The backend pushes the selected
                      // branch, after checking it out.
                      { id: instanceId, message },
                      { onSuccess: () => closePushForm() }
                    )
                  }
                  isLoading={push.isPending}
                  disabled={!canPush}
                >
                  Push
                </Button>
              </div>
            </div>
          ) : null}

          {pull.isError ? (
            <ErrorState
              title="The pull failed"
              description={normalizeError(pull.error).message}
              className="py-6"
            />
          ) : null}
          {pull.data ? (
            <ReleaseOutputBlock
              title="Pull output"
              output={pull.data.output}
              emptyMessage="(no output captured)"
            />
          ) : null}

          {push.isError ? (
            <ErrorState
              title="The push failed"
              description={normalizeError(push.error).message}
              className="py-6"
            />
          ) : null}
          {push.data && !push.data.pushed ? (
            <div className="rounded-md bg-info-soft p-4 text-info-fg ring-1 ring-inset ring-info/20">
              <p className="text-sm font-semibold">Nothing to push</p>
              <p className="mt-1 text-sm">
                {push.data.reason ??
                  "There are no local changes to push."}
              </p>
            </div>
          ) : null}
          {push.data && push.data.pushed ? (
            <div className="space-y-3">
              <p className="text-sm text-fg-muted">
                Pushed {push.data.files.length}{" "}
                {push.data.files.length === 1 ? "file" : "files"} to{" "}
                <code className="font-mono">{push.data.branch}</code> (
                {push.data.sha_before.slice(0, 8)} →{" "}
                {push.data.sha_after.slice(0, 8)}).
              </p>
              <ul className="max-h-48 overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.8125rem] text-fg">
                {push.data.files.map((line) => (
                  <li key={line} className="whitespace-pre-wrap break-all">
                    {line}
                  </li>
                ))}
              </ul>
              <ReleaseOutputBlock
                title="Push output"
                output={push.data.output}
                emptyMessage="(no output captured)"
              />
            </div>
          ) : null}

          {push.data?.warnings?.length ? (
            <WarningBlock warnings={push.data.warnings} />
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-xs text-fg-subtle">
        <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Pull is fast-forward only — it never creates a merge commit. If the
          branch has diverged, git says so and nothing is retried for you.
        </span>
      </p>

      <ConfirmDialog
        open={confirmRevert}
        onClose={() => setConfirmRevert(false)}
        title="Revert these files?"
        description={`This discards every uncommitted change to ${selectedPaths.length} ${
          selectedPaths.length === 1 ? "file" : "files"
        } and restores it to HEAD. The discarded changes cannot be recovered. Untracked and newly added files are never deleted; they are reported as skipped.`}
        confirmLabel="Revert"
        tone="danger"
        requireCheckbox
        isLoading={revert.isPending}
        onConfirm={() =>
          revert.mutate(
            { id: instanceId, paths: selectedPaths },
            { onSuccess: () => setConfirmRevert(false) }
          )
        }
      />
    </Card>
  )
}

InstanceFilesPage.displayName = "InstanceFilesPage"
