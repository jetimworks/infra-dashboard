import { useEffect, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  ChevronRight,
  ChevronUp,
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
import { WarningBlock } from "../components/system/WarningBlock"
import { ReleaseOutputBlock } from "../components/releases/ReleaseOutputBlock"
import {
  useAppDirectory,
  useDirectoryListing,
  useFileContent,
  useGitPull,
  useGitPush,
  useGitStatus,
  useInstance,
  useInstanceEnv,
  useSetAppDirectory,
  useWriteEnv,
  useWriteFile,
} from "../queries/instances"
import { normalizeError } from "../api/errors"
import { cn, formatBytes, formatRelative } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import type { FileEntry, InstanceType } from "../api/types"

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

/**
 * A light client-side check on the app directory.
 *
 * The backend's charset is stricter than this (it also rejects shell
 * metacharacters), and it is the authority — a path this accepts but the
 * backend rejects comes back as a 400 whose message is shown verbatim. What
 * this catches is the handful of rules that are unambiguous enough to be worth
 * failing fast on.
 */
function validateAppDirectory(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return "Enter a path."
  if (!trimmed.startsWith("/")) return "The path must be absolute — it has to start with /."
  if (trimmed.split("/").includes("..")) return "The path must not contain a '..' component."
  if (/\s/.test(trimmed)) return "The path must not contain spaces."
  if (trimmed.includes("'")) return "The path must not contain a single quote."
  return null
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
        onSave={(path) => setAppDir.mutate({ id: instance.id, path })}
        saving={setAppDir.isPending}
        saveError={
          setAppDir.isError ? normalizeError(setAppDir.error).message : null
        }
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
        instanceId={instance.id}
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

function AppDirectoryCard({
  directory,
  loading,
  error,
  onSave,
  saving,
  saveError,
}: {
  directory: import("../api/types").AppDirectory | undefined
  loading: boolean
  error: { message: string } | null
  onSave: (path: string) => void
  saving: boolean
  saveError: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  const startEditing = () => {
    setDraft(directory?.path ?? "")
    setValidationError(null)
    setEditing(true)
  }

  const submit = () => {
    const problem = validateAppDirectory(draft)
    if (problem) {
      setValidationError(problem)
      return
    }
    onSave(draft.trim())
    setEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Application directory</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            The release pipeline deploys from here, the file browser opens here,
            and the git endpoints act on this repository.
          </p>
        </div>
        {directory ? (
          <StatusPill
            status={directory.source === "config" ? "success" : "warning"}
            size="sm"
            label={directory.source === "config" ? "Configured" : "Platform default"}
          />
        ) : null}
      </CardHeader>

      {error ? (
        <ErrorState
          title="Couldn't read the application directory"
          description={error.message}
          className="py-6"
        />
      ) : loading && !directory ? (
        <LoadingBlock label="Reading the application directory…" className="py-4" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 truncate rounded bg-surface-sunken px-2.5 py-2 font-mono text-[0.8125rem] text-fg">
              {directory?.path ?? "—"}
            </code>
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Save}
                  onClick={submit}
                  isLoading={saving}
                >
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditing}>
                Change
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="font-mono text-[0.8125rem]"
                spellCheck={false}
                error={validationError ?? undefined}
                hint="Absolute path, no spaces, no '..'."
              />
              {saveError ? (
                <p className="text-xs text-danger-fg">{saveError}</p>
              ) : null}
            </div>
          ) : null}

          {directory?.warnings?.length ? (
            <WarningBlock
              warnings={directory.warnings}
              title="The configured directory was rejected"
            />
          ) : null}
        </div>
      )}
    </Card>
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
  // The listing already knows the size, so a file over the cap is never
  // opened — the backend would answer 413 anyway.
  const tooLarge = !isDirectory && entry.size_bytes > MAX_EDITABLE_BYTES
  const Icon = isDirectory ? Folder : entry.type === "symlink" ? Link2 : FileText

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={tooLarge}
        aria-pressed={active}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150",
          active
            ? "bg-primary-soft text-primary"
            : "text-fg hover:bg-surface-sunken",
          tooLarge && "cursor-not-allowed opacity-60 hover:bg-transparent"
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

function GitPanel({
  status,
  loading,
  error,
  instanceId,
  pull,
  push,
}: {
  status: import("../api/types").GitStatus | undefined
  loading: boolean
  error: { message: string } | null
  instanceId: string
  pull: ReturnType<typeof useGitPull>
  push: ReturnType<typeof useGitPush>
}) {
  const [showPushForm, setShowPushForm] = useState(false)
  const [message, setMessage] = useState("")

  const dirty = status?.dirty ?? []
  const canPush = message.trim().length > 0

  const closePushForm = () => {
    setShowPushForm(false)
    setMessage("")
  }

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
            onClick={() => pull.mutate({ id: instanceId })}
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

          {status.warnings.length > 0 ? (
            <WarningBlock warnings={status.warnings} />
          ) : null}

          {dirty.length === 0 ? (
            <p className="text-sm text-fg-muted">
              The working tree is clean — nothing to commit.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                {dirty.length} {dirty.length === 1 ? "change" : "changes"}
              </p>
              <ul className="max-h-48 overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.8125rem] text-fg">
                {dirty.map((line) => (
                  <li key={line} className="whitespace-pre-wrap break-all">
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-fg-subtle">
                A push stages every untracked, non-ignored file — so this list is
                exactly what gets committed.
              </p>
            </div>
          )}

          {showPushForm ? (
            <div className="space-y-3 rounded-md border border-border/40 bg-surface-sunken p-4">
              <p className="text-sm font-medium text-fg">Commit message</p>
              {dirty.length > 0 ? (
                <ul className="max-h-32 overflow-auto rounded bg-surface p-2 font-mono text-[0.75rem] text-fg-muted">
                  {dirty.map((line) => (
                    <li key={line} className="whitespace-pre-wrap break-all">
                      {line}
                    </li>
                  ))}
                </ul>
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
    </Card>
  )
}

InstanceFilesPage.displayName = "InstanceFilesPage"
