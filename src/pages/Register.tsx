import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { APP_FULL_NAME } from "../config"
import { Mail, Lock, User, Phone, ArrowRight } from "lucide-react"

const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        email: data.email,
        phone: data.phone,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      })
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string | string[] } } })?.response?.data?.error ||
        Array.isArray((err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors)
          ? ((err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors as string[])[0]
          : "Registration failed. Please try again."
      toast.error(errorMessage)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Image */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden">
        {/* Image Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920&q=80')`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/70 to-[#2563eb]/40" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Start monitoring{' '}
              <span className="text-[#60a5fa]">in minutes.</span>
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              Set up in seconds. No credit card required.
              Join hundreds of teams already using Infra to monitor their infrastructure.
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-4 mt-12">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white/90">Free 14-day trial, no credit card needed</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white/90">Setup in less than 5 minutes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white/90">Cancel anytime, no questions asked</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full lg:w-[45%] items-center justify-center p-8 bg-[#faf8f5]">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-lg shadow-[#2563eb]/20">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="text-xl font-semibold text-[#1a1a2e]">{APP_FULL_NAME}</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-[#1a1a2e] mb-3 tracking-tight">Create account</h1>
            <p className="text-[#64748b] text-lg">Get started with Infra today.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-[#4a5568] font-medium">First name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                  <Input
                    id="first_name"
                    placeholder="John"
                    error={errors.first_name?.message}
                    className="pl-12 h-12 bg-white border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                    {...register("first_name")}
                  />
                </div>
                {errors.first_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-[#4a5568] font-medium">Last name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    error={errors.last_name?.message}
                    className="pl-12 h-12 bg-white border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                    {...register("last_name")}
                  />
                </div>
                {errors.last_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#4a5568] font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  error={errors.email?.message}
                  className="pl-12 h-12 bg-white border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#4a5568] font-medium">Phone number</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+14155551234"
                  error={errors.phone?.message}
                  className="pl-12 h-12 bg-white border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#4a5568] font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  error={errors.password?.message}
                  className="pl-12 h-12 bg-white border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-[#4a5568] font-medium">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Re-enter password"
                  error={errors.confirm_password?.message}
                  className="pl-12 h-12 bg-white border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                  {...register("confirm_password")}
                />
              </div>
              {errors.confirm_password && (
                <p className="text-sm text-red-500 mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-xl shadow-lg shadow-[#2563eb]/25 transition-all flex items-center justify-center gap-2 mt-6"
              isLoading={isSubmitting}
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-[#64748b]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#2563eb] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
