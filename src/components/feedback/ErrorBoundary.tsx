import { Component, type ErrorInfo, type ReactNode } from "react"
import { ErrorState } from "../ui/ErrorState"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Catches render-time errors anywhere in the tree and shows a friendly
 * recovery screen instead of the white screen of death. The reset action
 * reloads the page (the simplest correct behavior for a customer product —
 * a reset button that mutates tree state is a footgun).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
    console.error("[ErrorBoundary]", error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="mx-auto max-w-xl px-6 py-16">
          <ErrorState
            title="Something broke on this screen"
            description="We've logged the problem. You can try reloading the page to continue."
            error={this.state.error}
            onRetry={this.handleReset}
          />
        </div>
      )
    }
    return this.props.children
  }
}
