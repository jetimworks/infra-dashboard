import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { Card } from "../components/ui/Card"

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
    },
  })

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile(data)
      setIsEditing(false)
    } catch {
      // Error handled by API interceptor
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    reset({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
    })
  }

  return (
    <div className="max-w-2xl">
      <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Profile</h1>

        {!isEditing ? (
          <div className="space-y-3">
            <ProfileField label="ID" value={user?.id} />
            <ProfileField label="Email" value={user?.email} />
            <ProfileField label="Phone" value={user?.phone} />
            <ProfileField label="First Name" value={user?.first_name} />
            <ProfileField label="Last Name" value={user?.last_name} />
            <ProfileField label="Status" value={user?.status} />
            <ProfileField label="Verified" value={user?.is_verified ? "Yes" : "No"} />
            <ProfileField label="Created At" value={user?.created_at} />
            <div className="pt-4">
              <Button onClick={() => setIsEditing(true)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">Edit Profile</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="first_name" className="text-[var(--text-secondary)]">First Name</Label>
              <Input
                id="first_name"
                error={errors.first_name?.message}
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.first_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name" className="text-[var(--text-secondary)]">Last Name</Label>
              <Input
                id="last_name"
                error={errors.last_name?.message}
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.last_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="text-[var(--text-secondary)]">Phone</Label>
              <Input
                id="phone"
                error={errors.phone?.message}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={isSubmitting} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
                Save Changes
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex border-b border-[var(--border-color)] py-3">
      <span className="w-32 text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)]">{value || "-"}</span>
    </div>
  )
}
