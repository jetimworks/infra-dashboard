import { forwardRef, type InputHTMLAttributes } from "react"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-base placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500 focus:ring-red-500" : "border-black/20"} ${className || ""}`}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
