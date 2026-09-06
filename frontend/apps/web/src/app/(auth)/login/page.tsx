import type { Metadata } from "next"
import { LoginForm } from "@/features/auth"
import { BrandLogo } from "@/shared/components/brand/brand-logo"

export const metadata: Metadata = { title: "تسجيل الدخول" }

export default function LoginPage() {
  return (
    <section className="brand-shadow relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-card">
      <div className="h-1 bg-brand-gold" aria-hidden />
      <div className="p-8 sm:p-10">
      <div className="mb-8 text-start">
        <BrandLogo priority className="mb-7 w-48" />
        <h1 className="text-2xl font-medium text-brand-navy dark:text-card-foreground">مرحبًا بعودتك</h1>
      </div>
      <LoginForm />
      </div>
    </section>
  )
}
