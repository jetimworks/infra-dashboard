import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Save, ShieldCheck, User } from "lucide-react"
import { useAuth } from "../auth/useAuth"
import { useUpdateProfile } from "../queries/auth"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Tabs } from "../components/ui/Tabs"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Field } from "../components/ui/Input"
import { Skeleton } from "../components/ui/LoadingState"
import { formatDate } from "../lib/utils"
import { normalizeError } from "../api/errors"
import type { LucideIcon } from "lucide-react"

type TabValue = "profile" | "security" | "preferences"

const tabItems: { value: TabValue; label: string; icon: LucideIcon }[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "security", label: "Security", icon: ShieldCheck },
]

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
})

type ProfileForm = z.infer<typeof profileSchema>

export function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>("profile")
  const updateProfile = useUpdateProfile()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone ?? "",
        }
      : undefined,
  })

  const onSubmit = async (data: ProfileForm) => {
    setErrorMsg(null)
    try {
      await updateProfile.mutateAsync(data)
      reset(data)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Your account
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Profile, security, and notification preferences.
        </p>
      </div>

      <Tabs value={tab} onChange={setTab} items={tabItems} />

      {tab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMsg ? (
              <div
                role="alert"
                className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
              >
                {errorMsg}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="First name"
                htmlFor="first_name"
                required
                error={errors.first_name?.message}
              >
                <Input
                  id="first_name"
                  autoComplete="given-name"
                  {...register("first_name")}
                />
              </Field>
              <Field
                label="Last name"
                htmlFor="last_name"
                required
                error={errors.last_name?.message}
              >
                <Input
                  id="last_name"
                  autoComplete="family-name"
                  {...register("last_name")}
                />
              </Field>
            </div>
            <Field
              label="Email address"
              htmlFor="email"
              hint="Email changes require a verification step — email us to update."
            >
              <Input
                id="email"
                type="email"
                value={user.email}
                readOnly
                disabled
              />
            </Field>
            <Field
              label="Phone number"
              htmlFor="phone"
              required
              hint="So we can reach you if something needs urgent attention"
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...register("phone")}
              />
            </Field>
            <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={updateProfile.isPending}
                disabled={!isDirty}
                leftIcon={Save}
              >
                Save changes
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <SecurityRow
              label="Password"
              description="Update the password you use to sign in."
              actionLabel="Change password"
              onAction={() => navigate("/change-password")}
            />
            <SecurityRow
              label="Sign out"
              description={`Signed in as ${user.email}. Last sign-in ${formatDate(user.last_logged_in)}.`}
              actionLabel="Sign out"
              onAction={() => {
                logout()
                navigate("/login", { replace: true })
              }}
              tone="danger"
            />
          </div>
        </Card>
      )}
    </div>
  )
}

function SecurityRow({
  label,
  description,
  actionLabel,
  onAction,
  tone = "default",
}: {
  label: string
  description: string
  actionLabel: string
  onAction: () => void
  tone?: "default" | "danger"
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-sunken/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
      </div>
      <Button
        variant={tone === "danger" ? "outline" : "secondary"}
        size="sm"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  )
}
