"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@workspace/ui/components/button"
import { useSignIn } from "../hooks/use-auth-mutations"
import { loginSchema, type LoginValues } from "../schemas/login-schema"
import { feedback } from "@/shared/components/feedback/toast"
import { useMockServices } from "@/shared/config/service-mode"
import { toServiceError } from "@/shared/utils/errors"

export function LoginForm() {
  const router = useRouter()
  const signIn = useSignIn()
  const [visible, setVisible] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })

  const submit = handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values)
      feedback.success("تم تسجيل الدخول بنجاح")
      router.push("/dashboard")
    } catch (error) {
      feedback.error(toServiceError(error).messageKey)
    }
  })

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</label>
        <input id="email" dir="ltr" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-lg border px-3 text-left outline-none focus-visible:ring-2" {...register("email")} />
        {errors.email && <p id="email-error" role="alert" className="text-destructive text-sm">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">كلمة المرور</label>
        <div className="relative">
          <input id="password" type={visible ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-lg border px-3 ps-11 outline-none focus-visible:ring-2" {...register("password")} />
          <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="focus-visible:ring-ring absolute inset-y-0 start-1 grid w-10 place-items-center rounded-md focus-visible:ring-2">
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p id="password-error" role="alert" className="text-destructive text-sm">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={signIn.isPending} className="h-11 w-full gap-2">
        <LogIn className="size-4" aria-hidden />
        {signIn.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </Button>
      {useMockServices && (
        <p className="text-muted-foreground text-center text-xs">
          بيئة تجريبية — استخدم employee@alsalam.edu / demo1234
        </p>
      )}
    </form>
  )
}
