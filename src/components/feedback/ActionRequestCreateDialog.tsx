import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Drawer } from "../ui/Drawer"
import { Button } from "../ui/Button"
import { Input, Field, Textarea } from "../ui/Input"
import { useCreateActionRequest } from "../../queries/action-requests"
import { useInstances } from "../../queries/instances"
import { useProject } from "../../contexts/ProjectContext"

interface ActionRequestCreateDialogProps {
  open: boolean
  onClose: () => void
  /** Pre-selected instance (optional) */
  instanceId?: string
  /** Pre-fill title (optional) */
  initialTitle?: string
  /** Pre-fill description (optional) */
  initialDescription?: string
}

export function ActionRequestCreateDialog({
  open,
  onClose,
  instanceId: preSelectedInstanceId,
  initialTitle,
  initialDescription,
}: ActionRequestCreateDialogProps) {
  const navigate = useNavigate()
  const { selectedProjectId } = useProject()
  const createMutation = useCreateActionRequest()
  const instancesQ = useInstances({ projectId: selectedProjectId ?? undefined })

  const [title, setTitle] = useState(initialTitle ?? "")
  const [description, setDescription] = useState(initialDescription ?? "")
  const [instanceId, setInstanceId] = useState(preSelectedInstanceId ?? "")
  const [titleError, setTitleError] = useState("")
  const [descError, setDescError] = useState("")
  const [instanceError, setInstanceError] = useState("")

  // Sync state when dialog opens with new prefill values
  useEffect(() => {
    if (open) {
      setTitle(initialTitle ?? "")
      setDescription(initialDescription ?? "")
    }
  }, [open, initialTitle, initialDescription])

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setInstanceId(preSelectedInstanceId ?? "")
    setTitleError("")
    setDescError("")
    setInstanceError("")
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!title.trim()) {
      setTitleError("Title is required")
      hasError = true
    } else {
      setTitleError("")
    }
    if (!description.trim()) {
      setDescError("Description is required")
      hasError = true
    } else {
      setDescError("")
    }
    if (!selectedProjectId) {
      toast.error("No project selected. Please select a project first.")
      hasError = true
    }
    if (!instanceId) {
      setInstanceError("Please select an instance")
      hasError = true
    } else {
      setInstanceError("")
    }
    if (hasError) return

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        project_id: selectedProjectId,
        instance_id: instanceId,
      })
      handleClose()
      navigate(`/action-requests/${result.id}`)
    } catch {
      // Error handled by mutation
    }
  }

  const instances = instancesQ.data ?? []

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Create action request"
      description="Describe what you need and we'll get it done."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Title"
          htmlFor="ar-title"
          required
          error={titleError}
          hint="Brief summary of what you need"
        >
          <Input
            id="ar-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Increase storage, restart service"
            autoFocus
          />
        </Field>

        <Field
          label="Description"
          htmlFor="ar-description"
          required
          error={descError}
          hint="The more detail you give, the faster we can help"
        >
          <Textarea
            id="ar-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What needs to happen, and why?"
          />
        </Field>

        <Field
          label="Instance"
          htmlFor="ar-instance"
          required
          error={instanceError}
          hint={!selectedProjectId ? "Select a project first to see instances" : undefined}
        >
          <select
            id="ar-instance"
            value={instanceId}
            onChange={(e) => {
              setInstanceId(e.target.value)
              setInstanceError("")
            }}
            disabled={!selectedProjectId || instancesQ.isLoading}
            className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-sunken disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <option value="">
              {instancesQ.isLoading ? "Loading instances..." : "Select an instance"}
            </option>
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} {inst.host ? `(${inst.host})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
          >
            Submit request
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
