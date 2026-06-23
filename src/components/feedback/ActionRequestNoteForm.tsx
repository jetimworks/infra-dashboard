import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "../ui/Button"
import { Textarea } from "../ui/Input"

interface ActionRequestNoteFormProps {
  onSubmit: (message: string) => Promise<void>
  isLoading?: boolean
  placeholder?: string
}

export function ActionRequestNoteForm({
  onSubmit,
  isLoading,
  placeholder = "Add a note...",
}: ActionRequestNoteFormProps) {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError("Note cannot be empty")
      return
    }
    setError("")
    try {
      await onSubmit(message.trim())
      setMessage("")
    } catch {
      // Error handled by parent
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={3}
        error={error}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isLoading}
          disabled={!message.trim()}
          rightIcon={Send}
        >
          Send
        </Button>
      </div>
    </form>
  )
}
