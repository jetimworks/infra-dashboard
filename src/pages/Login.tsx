import { Link } from "react-router-dom"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { APP_FULL_NAME } from "../config"
import { Mail, Lock, ArrowRight } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginForm) => {
    setLoginError(null)

    login(data).catch((err: unknown) => {
      const errorMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Invalid email or password."
      setLoginError(errorMessage)
    })
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
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
            <h1 className="text-4xl font-bold text-[#1a1a2e] mb-3 tracking-tight">Welcome back</h1>
            <p className="text-[#64748b] text-lg">Sign in to access your dashboard.</p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
              {loginError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#4a5568] font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748b]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  error={errors.email?.message}
                  className="pl-12 h-12 rounded-xl shadow-sm"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#4a5568] font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748b]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  className="pl-12 h-12 rounded-xl shadow-sm"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-xl shadow-lg shadow-[#2563eb]/25 transition-all flex items-center justify-center gap-2"
              isLoading={isSubmitting}
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-[#64748b]">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#2563eb] font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden">
        {/* Image Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80')`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/70 to-[#2563eb]/40" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Infrastructure monitoring,{' '}
              <span className="text-[#60a5fa]">simplified.</span>
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              Get real-time insights into your servers, databases, and network.
              Intuitive dashboards that make complex infrastructure feel effortless.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-12 mt-12">
            <div>
              <p className="text-3xl font-bold">99.98%</p>
              <p className="text-sm text-white/60 mt-1">Uptime SLA</p>
            </div>
            <div>
              <p className="text-3xl font-bold">&lt;100ms</p>
              <p className="text-sm text-white/60 mt-1">Response time</p>
            </div>
            <div>
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-sm text-white/60 mt-1">Monitoring</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </div>
  )
}
