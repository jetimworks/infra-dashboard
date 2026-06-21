import { toast as sonnerToast } from "sonner"

export const toast = {
  success: (message: string, opts?: { description?: string }) =>
    sonnerToast.success(message, opts),
  error: (message: string, opts?: { description?: string }) =>
    sonnerToast.error(message, opts),
  info: (message: string, opts?: { description?: string }) =>
    sonnerToast.info(message, opts),
  warning: (message: string, opts?: { description?: string }) =>
    sonnerToast.warning(message, opts),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) =>
    sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}
