import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { Card } from "../components/ui/Card"

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_new_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Passwords don't match",
    path: ["confirm_new_password"],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export function ChangePasswordPage() {
  const { user, changePassword, refreshUser } = useAuth()
  const isOnboarding = user?.onboarding_stage === "CHANGE_PASSWORD"

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      // Re-fetch user to update onboarding_stage
      await refreshUser()
      toast.success("Password changed successfully")
      reset()
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to change password. Please try again."
      toast.error(errorMessage)
    }
  }

  return (
    <div className="max-w-md">
      {isOnboarding && (
        <div className="mb-4 rounded-lg bg-[var(--accent-subtle)] p-4 text-[var(--accent)] border border-[var(--accent)]/20">
          Please set a new password to continue.
        </div>
      )}

      <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Change Password</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label htmlFor="current_password" className="text-[var(--text-secondary)]">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              error={errors.current_password?.message}
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.current_password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="new_password" className="text-[var(--text-secondary)]">New Password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="Min 8 characters"
              error={errors.new_password?.message}
              {...register("new_password")}
            />
            {errors.new_password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm_new_password" className="text-[var(--text-secondary)]">Confirm New Password</Label>
            <Input
              id="confirm_new_password"
              type="password"
              placeholder="Re-enter new password"
              error={errors.confirm_new_password?.message}
              {...register("confirm_new_password")}
            />
            {errors.confirm_new_password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.confirm_new_password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white" isLoading={isSubmitting}>
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  )
}
