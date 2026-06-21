import axios, { type AxiosError } from "axios"

/**
 * Normalized error returned by every API call. Components only ever see this
 * shape — never raw axios errors. The friendly `message` is what we render in
 * UI; `details` is the joined validator messages if the backend returned an
 * `{errors: [...]}` envelope.
 */
export class ApiError extends Error {
  status: number
  details?: string[]

  constructor(status: number, message: string, details?: string[]) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

interface ErrorBody {
  error?: string
  errors?: string[]
  message?: string
}

/**
 * Convert any thrown value into an ApiError. Handles the two backend error
 * shapes ({error}, {errors[]}), network errors (status 0), and unknown throws.
 */
export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  const axiosErr = err as AxiosError<ErrorBody>
  if (axios.isAxiosError(axiosErr)) {
    const data = axiosErr.response?.data
    const status = axiosErr.response?.status ?? 0
    if (data?.errors && data.errors.length > 0) {
      return new ApiError(status, data.errors.join(". "), data.errors)
    }
    if (data?.error) {
      return new ApiError(status, data.error)
    }
    if (data?.message) {
      return new ApiError(status, data.message)
    }
    if (status === 0) {
      return new ApiError(
        0,
        "We couldn't reach the server. Check your connection and try again."
      )
    }
    if (status === 401) {
      return new ApiError(401, "Your session has expired. Please sign in again.")
    }
    if (status === 403) {
      return new ApiError(403, "You don't have permission to do that.")
    }
    if (status === 404) {
      return new ApiError(404, "We couldn't find that.")
    }
    if (status >= 500) {
      return new ApiError(
        status,
        "Something went wrong on our end. Please try again in a moment."
      )
    }
    return new ApiError(status, "Something went wrong. Please try again.")
  }
  if (err instanceof Error) return new ApiError(0, err.message)
  return new ApiError(0, "Something went wrong. Please try again.")
}
