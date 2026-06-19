import { forwardRef, type InputHTMLAttributes } from "react"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-10 w-full rounded-lg border-2 px-3 py-2 text-base placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-red-500 focus:ring-red-500 bg-white text-[#1a1a2e]"
            : "border-[#d1d5db] focus:ring-[#2563eb] bg-white text-[#1a1a2e]"
        } ${className || ""}`}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
