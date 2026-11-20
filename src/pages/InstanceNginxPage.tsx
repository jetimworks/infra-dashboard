import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CheckCircle2,
  ChevronRight,
  FileCode2,
  FileWarning,
  FlaskConical,
  Link2,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Server,
  ShieldCheck,
  Unlink,
  XCircle,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Input, Textarea } from "../components/ui/Input"
import { StatusPill } from "../components/ui/StatusPill"
import { LoadingPage, LoadingBlock } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { WarningBlock } from "../components/system/WarningBlock"
import { useInstance } from "../queries/instances"
import {
  useDisableNginxSite,
  useEnableNginxSite,
  useNginxSite,
  useNginxSites,
  useReloadNginx,
  useSaveNginxSite,
  useTestNginx,
} from "../queries/nginx"
import { normalizeError, type ApiError } from "../api/errors"
import { cn, formatBytes, formatRelative } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import type {
  InstanceType,
  NginxReloadResponse,
  NginxSite,
  NginxSiteWriteResponse,
  NginxTestResponse,
} from "../api/types"

const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REMOTE_RDS: "Remote database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

/** The backend's hard cap for one site file. */
const MAX_SITE_BYTES = 1024 * 1024

/**
 * The filename the backend accepts. It is never a path: a slash, a backslash,
 * a leading dot, a space or a shell metacharacter is a 400.
 */
const SITE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

const encoder = new TextEncoder()

/** The result of the last `nginx -t`, from a save or an explicit test. */
interface LastTest {
  valid: boolean
  output: string
  warnings: string[]
  source: "save" | "test"
}

interface PendingToggle {
  name: string
}

/**
 * Nginx site configuration.
 *
 * Three rules from the API drive the whole page:
 *
 *   1. Saving is not applying. A PUT writes the file; the running nginx keeps
 *      its old configuration until a reload.
 *   2. A failed test is not a failed save. `valid: false` is a 200 and the
 *      file is on disk, so the editor stays open with the operator's buffer.
 *   3. `enabled` is the source of truth, not `enabled_target`. A foreign link
 *      can make a file look enabled while nginx is not loading it.
 */
export function InstanceNginxPage() {
  const { id } = useParams<{ id: string }>()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  // Site files only exist on a VPS. Passing no id until the instance is known
  // to be one keeps a nonsensical request off the wire for every other type.
  const sitesQ = useNginxSites(
    instanceQ.data?.type === "VPS" ? id : undefined
  )

  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [buffer, setBuffer] = useState("")
  const [loadedContent, setLoadedContent] = useState("")

  // A ref mirrors the editor so a background refetch cannot overwrite text
  // the operator is in the middle of typing.
  const editorRef = useRef({
    name: null as string | null,
    buffer: "",
    loaded: "",
  })

  // A save runs nginx -t, so it can finish after the operator has clicked a
  // different file. The token changes whenever the editor is re-pointed; a
  // late result must never be written into the new file's state.
  const viewTokenRef = useRef(0)

  const siteQ = useNginxSite(
    id,
    creating ? undefined : selectedName ?? undefined
  )

  const saveSite = useSaveNginxSite()
  const enableSite = useEnableNginxSite()
  const disableSite = useDisableNginxSite()
  const testNginx = useTestNginx()
  const reloadNginx = useReloadNginx()

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<NginxSiteWriteResponse | null>(
    null
  )
  const [lastTest, setLastTest] = useState<LastTest | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [reloadResult, setReloadResult] =
    useState<NginxReloadResponse | null>(null)
  const [reloadError, setReloadError] = useState<string | null>(null)

  const site = siteQ.data
  const siteError = siteQ.isError ? normalizeError(siteQ.error) : null
  const siteNotFound = Boolean(selectedName && siteError?.status === 404)

  // A 404 closes the editor by derivation rather than by a state write in an
  // effect. The list refetch then removes the row itself.
  const activeName = siteNotFound ? null : selectedName
  const activeSite =
    activeName && site && site.name === activeName ? site : undefined

  const targetName = creating ? newName : activeName
  const nameValid = Boolean(targetName && SITE_NAME_RE.test(targetName))
  const showNameError = creating && newName.length > 0 && !nameValid

  const contentBytes = useMemo(
    () => encoder.encode(buffer).length,
    [buffer]
  )
  const contentTooLarge = contentBytes > MAX_SITE_BYTES
  const contentHasNul = buffer.includes("\u0000")

  // A non-empty file with empty content had its content withheld. This is the
  // one reliable signal across binary data, invalid UTF-8 and the 1 MiB cap.
  const contentWithheld = Boolean(
    activeSite && activeSite.content === "" && activeSite.size_bytes > 0
  )

  const dirty = buffer !== loadedContent

  const pendingToggle: PendingToggle | null = enableSite.isPending
    ? { name: enableSite.variables?.name ?? "" }
    : disableSite.isPending
      ? { name: disableSite.variables?.name ?? "" }
      : null

  const togglePending = Boolean(pendingToggle)
  const enableBlockedName =
    saveResult && !saveResult.valid ? activeName : null

  // Seed the editor from the single-site response unless it would discard a
  // dirty buffer for the same file.
  useEffect(() => {
    if (!site || creating) return
    const state = editorRef.current
    const sameFile = state.name === site.name
    const hasUnsavedEdits = state.buffer !== state.loaded
    if (sameFile && hasUnsavedEdits) return
    state.name = site.name
    state.buffer = site.content
    state.loaded = site.content
    setBuffer(site.content)
    setLoadedContent(site.content)
  }, [site, creating])

  // A site removed from the host refreshes the list. The editor closes itself
  // through `activeName`; no state is written from this effect.
  const refetchSites = sitesQ.refetch
  useEffect(() => {
    if (!siteNotFound) return
    toast.error("That site no longer exists. The list has been refreshed.")
    void refetchSites()
  }, [siteNotFound, refetchSites])

  const openSite = (name: string) => {
    viewTokenRef.current += 1
    setCreating(false)
    setNewName("")
    setSelectedName(name)
    setSaveError(null)
    setSaveResult(null)
    setBuffer("")
    setLoadedContent("")
    editorRef.current = { name: null, buffer: "", loaded: "" }
  }

  const startCreate = () => {
    viewTokenRef.current += 1
    setSelectedName(null)
    setCreating(true)
    setNewName("")
    setSaveError(null)
    setSaveResult(null)
    setBuffer("")
    setLoadedContent("")
    editorRef.current = { name: null, buffer: "", loaded: "" }
  }

  const handleBuffer = (value: string) => {
    setBuffer(value)
    editorRef.current.buffer = value
  }

  const handleSave = () => {
    if (!id || !targetName || !nameValid) return
    if (contentWithheld || contentTooLarge || contentHasNul) return
    if (!creating && !dirty) return

    setSaveError(null)
    setSaveResult(null)
    // The file is about to change, so any previous test/reload verdict no
    // longer describes the current disk state.
    setTestError(null)
    setReloadResult(null)
    setReloadError(null)
    const token = viewTokenRef.current
    saveSite.mutate(
      { id, name: targetName, content: buffer },
      {
        onSuccess: (result, vars) => {
          // `nginx -t` tests the whole server, so the verdict holds no matter
          // which file is open now.
          setLastTest({
            valid: result.valid,
            output: result.test_output,
            warnings: result.warnings ?? [],
            source: "save",
          })
          if (viewTokenRef.current !== token) {
            // The operator moved to another file while the save ran. Report the
            // outcome without writing the old file's state into the new editor.
            if (result.valid) toast.success(`Saved ${result.name}`)
            else toast.warning(`${result.name} was saved, but nginx rejects it`)
            return
          }
          setSaveResult(result)
          // The file on disk is now exactly what was sent. The editor keeps
          // whatever is currently typed; the ref may be newer if the operator
          // typed while the save was in flight, which is correctly still dirty.
          setLoadedContent(vars.content)
          editorRef.current = {
            name: result.name,
            buffer: editorRef.current.buffer,
            loaded: vars.content,
          }
          if (creating) {
            setCreating(false)
            setNewName("")
            setSelectedName(result.name)
          }
        },
        onError: (err) => {
          const error = normalizeError(err)
          if (viewTokenRef.current !== token) {
            toast.error(`${targetName}: ${error.message}`)
          } else {
            setSaveError(describeSaveError(error))
          }
          // A missing target or a server-side failure leaves the disk state
          // uncertain, so a previous test can no longer gate a reload.
          if (error.status === 404 || error.status >= 500) {
            setLastTest(null)
          }
          if (
            error.status === 404 ||
            error.status === 409 ||
            error.status >= 500
          ) {
            void sitesQ.refetch()
            if (selectedName && !creating) void siteQ.refetch()
          }
        },
      }
    )
  }

  const handleToggle = (name: string, enable: boolean) => {
    if (!id) return
    const mutation = enable ? enableSite : disableSite
    mutation.mutate(
      { id, name },
      {
        onSuccess: (result) => {
          const warning = result.warnings?.[0]
          if (!result.changed) {
            // changed: false is a success. A neutral toast, never an error.
            toast(
              warning ??
                (enable
                  ? "The site was already enabled."
                  : "The site was already disabled.")
            )
            return
          }
          toast.success(enable ? `Enabled ${name}` : `Disabled ${name}`)
          // The configuration just changed. The last test no longer covers
          // what a reload would apply, so Reload stays disabled until a new
          // test passes.
          setLastTest(null)
          setTestError(null)
          setReloadResult(null)
          setReloadError(null)
        },
        onError: (err) => {
          const error = normalizeError(err)
          toast.error(error.message)
          // A gone file or a server-side failure leaves the enabled set
          // uncertain, so the previous verdict no longer gates a reload.
          if (error.status === 404 || error.status >= 500) {
            setLastTest(null)
            setReloadResult(null)
            setReloadError(null)
          }
          if (error.status === 409 || error.status >= 500) {
            void sitesQ.refetch()
            if (selectedName === name) void siteQ.refetch()
          }
          if (error.status === 404) {
            void sitesQ.refetch()
            // Compare against the file actually open now, not the selection at
            // click time: the operator may have moved to another site while the
            // request was in flight.
            if (editorRef.current.name === name) {
              setSelectedName(null)
              setBuffer("")
              setLoadedContent("")
              editorRef.current = { name: null, buffer: "", loaded: "" }
            }
          }
        },
      }
    )
  }

  const handleTest = () => {
    if (!id) return
    setTestError(null)
    setReloadResult(null)
    setReloadError(null)
    testNginx.mutate(
      { id },
      {
        onSuccess: (result: NginxTestResponse) => {
          setLastTest({
            valid: result.valid,
            output: result.output,
            warnings: result.warnings ?? [],
            source: "test",
          })
        },
        onError: (err) => {
          setTestError(normalizeError(err).message)
        },
      }
    )
  }

  const handleReload = () => {
    if (!id || !lastTest?.valid) return
    setReloadResult(null)
    setReloadError(null)
    reloadNginx.mutate(
      { id },
      {
        onSuccess: (result) => {
          setReloadResult(result)
          if (result.reloaded) toast.success("Nginx reloaded")
        },
        onError: (err) => {
          setReloadError(normalizeError(err).message)
        },
      }
    )
  }

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
        <span className="font-medium text-fg">Web server sites</span>
      </nav>

      <header>
        <h1 className="font-display text-2xl font-semibold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          Nginx sites
        </h1>
        <p className="mt-1 text-body text-fg-muted">
          Edit the site files in{" "}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-caption">
            /etc/nginx/sites-available
          </code>
          , enable them, and test or reload nginx when you are ready.
        </p>
      </header>

      {!isVps ? (
        <Card>
          <EmptyState
            icon={Server}
            title="Nginx configuration is only available on servers"
            description={`This is a ${typeLabel[instance.type].toLowerCase()} resource — there's no nginx site directory to manage.`}
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      ) : (
        <>
          <ServerConfigPanel
            lastTest={lastTest}
            testError={testError}
            reloadResult={reloadResult}
            reloadError={reloadError}
            testPending={testNginx.isPending}
            reloadPending={reloadNginx.isPending}
            savePending={saveSite.isPending}
            onTest={handleTest}
            onReload={handleReload}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
            <SiteList
              sites={sitesQ.data?.sites ?? []}
              directory={sitesQ.data?.directory ?? "/etc/nginx/sites-available"}
              enabledDirectory={
                sitesQ.data?.enabled_directory ?? "/etc/nginx/sites-enabled"
              }
              warnings={sitesQ.data?.warnings ?? []}
              loading={sitesQ.isLoading}
              error={sitesQ.isError ? normalizeError(sitesQ.error) : null}
              selectedName={activeName}
              pendingToggle={pendingToggle}
              enableBlockedName={enableBlockedName}
              savePending={saveSite.isPending}
              onSelect={openSite}
              onNew={startCreate}
              onToggle={handleToggle}
              onRefresh={() => sitesQ.refetch()}
            />

            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-fg-muted" aria-hidden />
                  {creating ? (
                    <span className="text-sm font-semibold text-fg">
                      New site
                    </span>
                  ) : activeSite ? (
                    <span className="truncate font-mono text-sm text-fg">
                      {activeSite.name}
                    </span>
                  ) : (
                    <span className="text-sm text-fg-muted">
                      Pick a site from the list
                    </span>
                  )}
                  {activeSite ? (
                    <StatusPill
                      status={activeSite.enabled ? "success" : "inactive"}
                      size="sm"
                      label={activeSite.enabled ? "Enabled" : "Disabled"}
                    />
                  ) : null}
                  {dirty && (creating || activeSite) ? (
                    <StatusPill
                      status="warning"
                      size="sm"
                      label="Unsaved changes"
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeSite ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={activeSite.enabled ? Unlink : Link2}
                      onClick={() =>
                        handleToggle(activeSite.name, !activeSite.enabled)
                      }
                      isLoading={pendingToggle?.name === activeSite.name}
                      disabled={
                        togglePending ||
                        saveSite.isPending ||
                        (!activeSite.enabled &&
                          activeSite.name === enableBlockedName)
                      }
                      title={
                        saveSite.isPending
                          ? "Wait for the save to finish."
                          : !activeSite.enabled &&
                              activeSite.name === enableBlockedName
                            ? "Fix the failed nginx test before enabling this site."
                            : undefined
                      }
                    >
                      {activeSite.enabled ? "Disable" : "Enable"}
                    </Button>
                  ) : null}
                  {!contentWithheld ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={Save}
                      onClick={handleSave}
                      isLoading={saveSite.isPending}
                      disabled={
                        !nameValid ||
                        contentTooLarge ||
                        contentHasNul ||
                        (!creating && !dirty) ||
                        saveSite.isPending ||
                        togglePending ||
                        testNginx.isPending ||
                        reloadNginx.isPending
                      }
                    >
                      Save
                    </Button>
                  ) : null}
                </div>
              </div>

              {(!activeName && !creating) ? (
                <EmptyState
                  icon={FileCode2}
                  title="Select a site to edit"
                  description="Each file in sites-available opens here. Create a new site if the one you need does not exist yet — saving writes it to the host and tests it with nginx."
                  action={{
                    label: "Create a site",
                    onClick: startCreate,
                    icon: Plus,
                  }}
                  className="py-12"
                />
              ) : creating ? (
                <SiteEditor
                  site={undefined}
                  siteLoading={false}
                  siteError={null}
                  creating
                  newName={newName}
                  onNewNameChange={setNewName}
                  nameError={
                    showNameError
                      ? "Use letters, digits, dot, underscore or dash. Start with a letter or digit."
                      : undefined
                  }
                  nameHint="The filename in sites-available, e.g. example.com or example.com.conf. It is never accepted as a path."
                  buffer={buffer}
                  onBufferChange={handleBuffer}
                  dirty={dirty}
                  contentBytes={contentBytes}
                  contentTooLarge={contentTooLarge}
                  contentHasNul={contentHasNul}
                  contentWithheld={false}
                  savePending={saveSite.isPending}
                  saveError={saveError}
                  saveResult={saveResult}
                />
              ) : (
                <SiteEditor
                  site={activeSite}
                  siteLoading={siteQ.isLoading}
                  siteError={
                    siteError && siteError.status !== 404 ? siteError : null
                  }
                  creating={false}
                  newName=""
                  onNewNameChange={() => undefined}
                  nameError={undefined}
                  nameHint=""
                  buffer={buffer}
                  onBufferChange={handleBuffer}
                  dirty={dirty}
                  contentBytes={contentBytes}
                  contentTooLarge={contentTooLarge}
                  contentHasNul={contentHasNul}
                  contentWithheld={contentWithheld}
                  savePending={saveSite.isPending}
                  saveError={saveError}
                  saveResult={saveResult}
                />
              )}
            </Card>
          </div>

          <Card>
            <p className="text-xs text-fg-subtle">
              Saving writes the file immediately and runs nginx -t. It does not
              apply the configuration to the running nginx until you reload.
              There is no delete button here: removing a site is a deliberate
              manual operation on the host.
            </p>
          </Card>
        </>
      )}
    </motion.div>
  )
}

function ServerConfigPanel({
  lastTest,
  testError,
  reloadResult,
  reloadError,
  testPending,
  reloadPending,
  savePending,
  onTest,
  onReload,
}: {
  lastTest: LastTest | null
  testError: string | null
  reloadResult: NginxReloadResponse | null
  reloadError: string | null
  testPending: boolean
  reloadPending: boolean
  savePending: boolean
  onTest: () => void
  onReload: () => void
}) {
  const reloadReady = Boolean(lastTest?.valid)
  // A save writes the file and then tests it. Testing or reloading alongside
  // that race would judge a file that is still being written.
  const busy = testPending || reloadPending || savePending
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Server configuration</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            Test validates the entire nginx configuration, not only the site
            you are editing. Reload applies what is currently on disk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={FlaskConical}
            onClick={onTest}
            isLoading={testPending}
            disabled={busy}
            title={
              savePending ? "Wait for the save to finish." : undefined
            }
          >
            Test configuration
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={RotateCw}
            onClick={onReload}
            isLoading={reloadPending}
            disabled={!reloadReady || busy}
            title={
              savePending
                ? "Wait for the save to finish."
                : reloadReady
                  ? undefined
                  : "Run a configuration test that passes before reloading."
            }
          >
            Reload nginx
          </Button>
        </div>
      </CardHeader>

      {!reloadReady ? (
        <p className="mb-4 flex items-start gap-2 text-xs text-fg-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {lastTest
              ? "The last test failed, so Reload is disabled. Fix the configuration, save it, and test again."
              : "Reload is disabled until a configuration test passes."}
          </span>
        </p>
      ) : null}

      {lastTest ? (
        <div
          role="status"
          className={cn(
            "rounded-md p-4 ring-1 ring-inset",
            lastTest.valid
              ? "bg-success-soft text-success-fg ring-success/25"
              : "bg-danger-soft text-danger-fg ring-danger/25"
          )}
        >
          <div className="flex items-start gap-3">
            {lastTest.valid ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {lastTest.valid
                  ? "Configuration passed"
                  : "Configuration rejected"}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {lastTest.source === "save"
                  ? "nginx -t ran automatically after your last save."
                  : "Result of the last configuration test."}
              </p>
              <pre className="mt-3 max-h-48 overflow-auto rounded border border-current/20 bg-surface/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                {lastTest.output || "(no output captured)"}
              </pre>
              {lastTest.warnings.length > 0 ? (
                <WarningBlock warnings={lastTest.warnings} className="mt-3" />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {testError ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-3 rounded-md bg-danger-soft p-4 text-danger-fg ring-1 ring-inset ring-danger/25"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              The test could not run
            </p>
            <p className="mt-1 break-words text-sm text-fg">{testError}</p>
          </div>
        </div>
      ) : null}

      {reloadResult ? (
        <div
          role="status"
          className={cn(
            "mt-3 rounded-md p-4 ring-1 ring-inset",
            reloadResult.reloaded
              ? "bg-success-soft text-success-fg ring-success/25"
              : "bg-danger-soft text-danger-fg ring-danger/25"
          )}
        >
          <div className="flex items-start gap-3">
            {reloadResult.reloaded ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {reloadResult.reloaded
                  ? "Nginx reloaded"
                  : "Nginx refused the reload"}
              </p>
              {!reloadResult.reloaded ? (
                <p className="mt-1 text-sm">
                  The command ran, but the old configuration is still live.
                </p>
              ) : null}
              {reloadResult.output ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded border border-current/20 bg-surface/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                  {reloadResult.output}
                </pre>
              ) : null}
              {reloadResult.warnings.length > 0 ? (
                <WarningBlock
                  warnings={reloadResult.warnings}
                  className="mt-3"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {reloadError ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-3 rounded-md bg-danger-soft p-4 text-danger-fg ring-1 ring-inset ring-danger/25"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              The reload could not run
            </p>
            <p className="mt-1 break-words text-sm text-fg">{reloadError}</p>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function SiteList({
  sites,
  directory,
  enabledDirectory,
  warnings,
  loading,
  error,
  selectedName,
  pendingToggle,
  enableBlockedName,
  savePending,
  onSelect,
  onNew,
  onToggle,
  onRefresh,
}: {
  sites: NginxSite[]
  directory: string
  enabledDirectory: string
  warnings: string[]
  loading: boolean
  error: ApiError | null
  selectedName: string | null
  pendingToggle: PendingToggle | null
  enableBlockedName: string | null
  savePending: boolean
  onSelect: (name: string) => void
  onNew: () => void
  onToggle: (name: string, enable: boolean) => void
  onRefresh: () => void
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader className="px-4 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 className="h-4 w-4 text-fg-muted" aria-hidden />
          <CardTitle className="text-base">Sites</CardTitle>
          {sites.length > 0 ? (
            <span className="text-xs text-fg-muted">
              {sites.length} {sites.length === 1 ? "file" : "files"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={RefreshCw}
            onClick={onRefresh}
            isLoading={loading}
            aria-label="Refresh the site list"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={onNew}
          >
            New
          </Button>
        </div>
      </CardHeader>

      <div className="border-y border-border/30 px-4 py-2">
        <p className="truncate font-mono text-[11px] text-fg-muted">
          {directory}
        </p>
        <p className="truncate font-mono text-[11px] text-fg-subtle">
          {enabledDirectory}
        </p>
      </div>

      {warnings.length > 0 ? (
        <div className="px-4 pt-3">
          <WarningBlock warnings={warnings} />
        </div>
      ) : null}

      {error ? (
        <div className="px-4 py-3">
          <ErrorState
            title="Couldn't read the site files"
            description={error.message}
            onRetry={onRefresh}
            className="py-6"
          />
        </div>
      ) : loading && sites.length === 0 ? (
        <div className="px-4 py-3">
          <LoadingBlock label="Reading the site files…" className="py-6" />
        </div>
      ) : sites.length === 0 ? (
        <div className="px-4 py-3">
          <EmptyState
            icon={FileCode2}
            tone="info"
            title="No site files"
            description="There is nothing in sites-available yet. Create one here — it will be written to the host and tested with nginx."
            action={{
              label: "Create a site",
              onClick: onNew,
              icon: Plus,
            }}
            className="py-8"
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {sites.map((site) => {
            const busy = pendingToggle?.name === site.name
            const blocked = !site.enabled && site.name === enableBlockedName
            const foreignTarget =
              !site.enabled && site.enabled_target ? site.enabled_target : null
            return (
              <li
                key={site.name}
                className={cn(
                  "flex items-stretch transition-colors",
                  selectedName === site.name ? "bg-primary-soft/40" : undefined
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(site.name)}
                  aria-pressed={selectedName === site.name}
                  title={
                    foreignTarget
                      ? `${enabledDirectory}/${site.name} points to ${foreignTarget}, not this file.`
                      : site.enabled_target ?? undefined
                  }
                  className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-sunken/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {selectedName === site.name ? (
                      <span
                        className="inline-block h-4 w-0.5 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    <span className="truncate font-mono text-caption text-fg">
                      {site.name}
                    </span>
                    <StatusPill
                      status={site.enabled ? "success" : "inactive"}
                      size="sm"
                      label={site.enabled ? "Enabled" : "Disabled"}
                    />
                    {site.warnings.length > 0 ? (
                      <FileWarning
                        className="h-3.5 w-3.5 shrink-0 text-warning-fg"
                        aria-label={`${site.warnings.length} warning${
                          site.warnings.length === 1 ? "" : "s"
                        }`}
                      />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-2 pl-1 text-xs text-fg-muted">
                    <span className="tabular-nums">
                      {formatBytes(site.size_bytes)}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{formatRelative(site.modified_at)}</span>
                    {foreignTarget ? (
                      <span
                        className="truncate text-warning-fg"
                        title={`The sites-enabled entry points to ${foreignTarget}.`}
                      >
                        linked elsewhere
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate pl-1 font-mono text-[11px] text-fg-subtle">
                    {sitePreview(site)}
                  </span>
                </button>

                <div className="flex shrink-0 items-center px-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={site.enabled ? Unlink : Link2}
                    onClick={() => onToggle(site.name, !site.enabled)}
                    isLoading={busy}
                    disabled={Boolean(pendingToggle) || blocked || savePending}
                    title={
                      savePending
                        ? "Wait for the save to finish."
                        : blocked
                          ? "Fix the failed nginx test before enabling this site."
                          : site.enabled
                            ? "Remove this site from sites-enabled"
                            : "Link this site into sites-enabled"
                    }
                  >
                    {site.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function SiteEditor({
  site,
  siteLoading,
  siteError,
  creating,
  newName,
  onNewNameChange,
  nameError,
  nameHint,
  buffer,
  onBufferChange,
  dirty,
  contentBytes,
  contentTooLarge,
  contentHasNul,
  contentWithheld,
  savePending,
  saveError,
  saveResult,
}: {
  site: NginxSite | undefined
  siteLoading: boolean
  siteError: ApiError | null
  creating: boolean
  newName: string
  onNewNameChange: (value: string) => void
  nameError: string | undefined
  nameHint: string
  buffer: string
  onBufferChange: (value: string) => void
  dirty: boolean
  contentBytes: number
  contentTooLarge: boolean
  contentHasNul: boolean
  contentWithheld: boolean
  savePending: boolean
  saveError: string | null
  saveResult: NginxSiteWriteResponse | null
}) {
  if (siteError) {
    return (
      <div className="px-4 py-4">
        <ErrorState
          title="Couldn't read this site"
          description={siteError.message}
          className="py-8"
        />
      </div>
    )
  }

  if (!creating && siteLoading && !site) {
    return (
      <div className="px-4 py-4">
        <LoadingBlock label="Reading the site file…" className="py-12" />
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 pt-3">
      {creating ? (
        <div className="mb-4">
          <Input
            value={newName}
            onChange={(event) => onNewNameChange(event.target.value)}
            placeholder="example.com"
            aria-label="New site name"
            error={nameError}
            hint={nameHint}
            spellCheck={false}
            autoFocus
          />
        </div>
      ) : site ? (
        <div className="mb-4 space-y-1">
          <p className="break-all font-mono text-xs text-fg-muted">
            {site.path}
          </p>
          {site.enabled_target ? (
            <p className="break-all font-mono text-[11px] text-fg-subtle">
              sites-enabled entry: {site.enabled_target}
            </p>
          ) : null}
        </div>
      ) : null}

      {site && site.warnings.length > 0 ? (
        <WarningBlock warnings={site.warnings} className="mb-3" />
      ) : null}

      {saveResult?.warnings?.length ? (
        <WarningBlock warnings={saveResult.warnings} className="mb-3" />
      ) : null}

      {saveError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-3 rounded-md bg-danger-soft p-4 text-danger-fg ring-1 ring-inset ring-danger/25"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">The save failed</p>
            <p className="mt-1 break-words text-sm text-fg">{saveError}</p>
          </div>
        </div>
      ) : null}

      {saveResult && (!saveResult.valid || !dirty) ? (
        <SaveOutcome result={saveResult} />
      ) : null}

      {contentWithheld ? (
        <EmptyState
          icon={FileWarning}
          tone="warning"
          title="The contents of this file are withheld"
          description={`${site?.path ?? "This file"} is ${formatBytes(
            site?.size_bytes
          )}. Nginx site files are text; this one is binary, not valid UTF-8, or larger than 1 MiB. It can still be enabled or disabled, but it cannot be edited here.`}
          className="py-10"
        />
      ) : (
        <>
          <Textarea
            value={buffer}
            onChange={(event) => onBufferChange(event.target.value)}
            rows={26}
            className="font-mono text-caption"
            spellCheck={false}
            aria-label={
              creating
                ? "New site content"
                : `Contents of ${site?.name ?? "the site"}`
            }
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                "tabular-nums",
                contentTooLarge ? "text-danger-fg" : "text-fg-subtle"
              )}
            >
              {formatBytes(contentBytes)} / 1 MiB
              {dirty ? " · unsaved changes" : ""}
            </span>
            {contentTooLarge ? (
              <span className="text-danger-fg">
                This file is too large. The limit is 1 MiB.
              </span>
            ) : contentHasNul ? (
              <span className="text-danger-fg">
                The content contains a NUL byte, which the API rejects.
              </span>
            ) : (
              <span className="text-fg-subtle">
                Quotes, dollar signs and braces are sent as literal text.
              </span>
            )}
          </div>
        </>
      )}

      {savePending ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Writing the file and running nginx -t…
        </p>
      ) : null}

      <p className="mt-4 border-t border-border/40 pt-3 text-[11px] text-fg-subtle">
        Saving is not applying. The file is written to disk and tested with nginx
        -t immediately, but the running nginx keeps the old configuration until
        you reload it above.
      </p>
    </div>
  )
}

function SaveOutcome({ result }: { result: NginxSiteWriteResponse }) {
  return (
    <div
      role="status"
      className={cn(
        "mb-3 rounded-md p-4 ring-1 ring-inset",
        result.valid
          ? "bg-success-soft text-success-fg ring-success/25"
          : "bg-danger-soft text-danger-fg ring-danger/25"
      )}
    >
      <div className="flex items-start gap-3">
        {result.valid ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {result.valid ? (
            <>
              <p className="text-sm font-semibold">
                Saved and nginx accepts the configuration
              </p>
              <p className="mt-1 text-xs opacity-90">
                The file is on disk. Reload when you are ready to apply it.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">
                Saved, but nginx rejects this configuration.
              </p>
              <p className="mt-1 text-sm">
                Fix the error below, then save again. Do not reload yet.
              </p>
            </>
          )}
          <pre className="mt-3 max-h-56 overflow-auto rounded border border-current/20 bg-surface/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
            {result.test_output || "(no output captured)"}
          </pre>
        </div>
      </div>
    </div>
  )
}

/**
 * A short, single-line preview for the list. An empty file and a withheld
 * file look different even though both have `content: ""`.
 */
function sitePreview(site: NginxSite): string {
  if (site.content === "") {
    return site.size_bytes > 0 ? "Contents withheld" : "Empty file"
  }
  const lines = site.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
  return lines.length > 0 ? lines.join(" · ") : "Empty file"
}

function describeSaveError(error: ApiError): string {
  if (error.status === 413) {
    return `${error.message} A site file is limited to 1 MiB, so the editor contents were kept and nothing was written.`
  }
  if (error.status === 409) {
    return `${error.message} The target on the host was left untouched.`
  }
  if (error.status === 404) {
    return `${error.message} This instance no longer exists.`
  }
  if (error.status >= 500) {
    return `${error.message} We couldn't confirm the save. Refetch the site before trying again.`
  }
  return error.message
}

InstanceNginxPage.displayName = "InstanceNginxPage"
