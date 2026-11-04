import { useState } from "react"
import { Save } from "lucide-react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { Button } from "../ui/Button"
import { Textarea } from "../ui/Input"
import { StatusPill } from "../ui/StatusPill"
import { ErrorState } from "../ui/ErrorState"
import { LoadingBlock } from "../ui/LoadingState"
import { WarningBlock } from "./WarningBlock"
import { normalizeError } from "../../api/errors"
import { validateAppDirectory } from "../../lib/app-directory"
import type { AppDirectory } from "../../api/types"

/**
 * The application directory — the working directory the release pipeline
 * deploys from, the file browser opens at, and the git endpoints act on.
 *
 * The card is presentational: the parent owns the queries and hands down the
 * values, so the same card can live on the Files page and in the instance
 * Settings tab.
 */
export interface AppDirectoryCardProps {
  directory: AppDirectory | undefined
  loading: boolean
  error: { message: string } | null
  /**
   * Persists the path. Returns a promise so the editor can STAY OPEN when the
   * backend refuses the path — the refusal message ("the directory /root/app
   * does not exist on the instance") is the diagnosis, and the operator has to
   * be able to read it and correct the value.
   */
  onSave: (path: string) => Promise<unknown>
  saving: boolean
  /**
   * Warnings from the LAST SAVE, which the GET cannot reproduce.
   *
   * An unreachable host is a warning, not a refusal: the path is saved, but
   * nothing confirmed it exists on the host. That warning is returned by the
   * PUT and by nothing else — a later GET reports the stored path with no
   * warnings at all. Without carrying it forward, the operator sees a green
   * "App directory updated" and never learns the directory was never checked.
   */
  saveWarnings?: string[]
}

export function AppDirectoryCard({
  directory,
  loading,
  error,
  onSave,
  saving,
  saveWarnings = [],
}: AppDirectoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  // The refusal belongs to the attempt that caused it, so it is captured here
  // rather than read from the mutation: a stale refusal must not survive a
  // cancel and re-open.
  const [saveError, setSaveError] = useState<string | null>(null)

  const startEditing = () => {
    setDraft(directory?.path ?? "")
    setValidationError(null)
    setSaveError(null)
    setEditing(true)
  }

  const submit = async () => {
    const problem = validateAppDirectory(draft)
    if (problem) {
      setValidationError(problem)
      return
    }
    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch (err) {
      // The backend's refusal is the diagnosis. The editor stays open so the
      // operator can correct the path instead of retyping it.
      setSaveError(normalizeError(err).message)
    }
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

          {saveWarnings.length ? (
            <WarningBlock
              warnings={saveWarnings}
              title="Saved, but not confirmed on the host"
            />
          ) : null}
        </div>
      )}
    </Card>
  )
}
