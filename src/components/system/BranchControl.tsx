import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { WarningBlock } from "./WarningBlock"
import { useSetBranch } from "../../queries/instances"
import { normalizeError } from "../../api/errors"
import {
  isValidBranchName,
  readDeployBranch,
  validateBranch,
} from "../../lib/branch-name"
import type { Instance } from "../../api/types"

/**
 * The branch this instance tracks.
 *
 * Two facts, and they are not the same one:
 *
 *   - `instance.github_branch` is what was STORED. It may be empty, and it may
 *     be a value the backend does not even recognise — the backend does not
 *     validate the branch on write.
 *   - the branch the git endpoints act on is the effective one: the stored
 *     branch when it is valid, the release deploy branch otherwise.
 *
 * So the headline is the effective branch, and a stored value the backend
 * ignores is called out — otherwise the operator believes the instance moved
 * onto a branch it never went to.
 *
 * Changing the branch does not touch the host. The repository keeps whatever it
 * has checked out until the next pull or push.
 */
export interface BranchControlProps {
  instance: Instance
  /** The branch the git endpoints act on right now, from git status. */
  effectiveBranch?: string
}

export function BranchControl({ instance, effectiveBranch }: BranchControlProps) {
  const setBranch = useSetBranch()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  // Captured from the failed attempt rather than read off the mutation, so a
  // stale refusal does not survive a cancel and re-open.
  const [saveError, setSaveError] = useState<string | null>(null)

  const stored = instance.github_branch ?? ""
  const fallback = readDeployBranch(instance.config)
  const effective =
    effectiveBranch ?? (isValidBranchName(stored) ? stored : fallback)
  const storedIsInvalid = stored !== "" && !isValidBranchName(stored)

  const startEditing = () => {
    setDraft(stored)
    setValidationError(null)
    setSaveError(null)
    setEditing(true)
  }

  const submit = async () => {
    const problem = validateBranch(draft)
    if (problem) {
      setValidationError(problem)
      return
    }
    try {
      // The empty string is sent as-is: it is how the instance goes back to
      // the release deploy branch. Null would be an absent field, and a body
      // of nothing but nulls is a 400.
      await setBranch.mutateAsync({
        id: instance.id,
        branch: draft.trim(),
      })
      setEditing(false)
    } catch (err) {
      // The backend's message ("access denied") is the diagnosis, and it is
      // rendered below. The editor stays open so the operator can read it.
      setSaveError(normalizeError(err).message)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-fg-muted">Branch</span>
        <code className="min-w-0 flex-1 truncate rounded bg-surface-sunken px-2.5 py-2 font-mono text-[0.8125rem] text-fg">
          {effective}
        </code>
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={setBranch.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Save}
              onClick={submit}
              isLoading={setBranch.isPending}
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
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono text-[0.8125rem]"
            spellCheck={false}
            error={validationError ?? undefined}
            placeholder="e.g. release/2026-q4"
            hint={`The branch this instance tracks. Leave it empty to use the release deploy branch (${fallback}).`}
          />
          {saveError ? (
            <p className="text-xs text-danger-fg">{saveError}</p>
          ) : null}
        </div>
      ) : null}

      {storedIsInvalid ? (
        <WarningBlock
          title="The stored branch is not a valid git branch"
          warnings={[
            `The stored branch "${stored}" is not a valid git branch, so the release deploy branch (${fallback}) is used instead.`,
          ]}
        />
      ) : stored === "" ? (
        <p className="text-xs text-fg-muted">
          This instance doesn't pin a branch, so the release deploy branch (
          {fallback}) is used.
        </p>
      ) : null}
    </div>
  )
}
