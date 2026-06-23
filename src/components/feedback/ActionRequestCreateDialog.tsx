import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Drawer } from "../ui/Drawer"
import { Button } from "../ui/Button"
import { Input, Field, Textarea } from "../ui/Input"
import { useCreateActionRequest } from "../../queries/action-requests"

interface ActionRequestCreateDialogProps {
  open: boolean
  onClose: () => void
  projectId?: string
  instanceId?: string
}

export function ActionRequestCreateDialog({
  open,
  onClose,
  projectId,
  instanceId,
}: ActionRequestCreateDialogProps) {
  const navigate = useNavigate()
  const createMutation = useCreateActionRequest()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [titleError, setTitleError] = useState("")
  const [descError, setDescError] = useState("")

  const hasProject = Boolean(projectId)
  const hasInstance = Boolean(instanceId)

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setTitleError("")
    setDescError("")
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
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
    if (!hasProject) {
      toast.error("Please select a project before creating an action request")
      hasError = true
    }
    if (!hasInstance) {
      toast.error("Please select an instance before creating an action request")
      hasError = true
    }
    if (hasError) return

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        project_id: projectId || null,
        instance_id: instanceId || null,
      })
      handleClose()
      navigate(`/action-requests/${result.id}`)
    } catch {
      // Error handled by mutation
    }
  }

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
