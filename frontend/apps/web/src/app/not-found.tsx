import Link from "next/link"
import { ArrowRight, LayoutDashboard, SearchX } from "lucide-react"
import { BrandLogo } from "@/shared/components/brand/brand-logo"

export default function NotFound() {
  return <main className="relative grid min-h-svh place-items-center overflow-hidden bg-brand-bg p-6 dark:bg-background">
    <div className="absolute inset-x-0 top-0 h-1 bg-brand-gold" aria-hidden />
    <div className="absolute -start-24 top-20 size-72 rounded-full bg-brand-blue/5 blur-3xl" aria-hidden />
    <section className="relative w-full max-w-3xl text-center" aria-labelledby="not-found-title">
      <BrandLogo priority className="mx-auto mb-10 w-36" />
      <div className="relative mx-auto mb-7 grid size-24 place-items-center">
        <span className="absolute inset-0 rotate-6 rounded-xl border border-brand-blue/15 bg-white shadow-sm dark:bg-card" aria-hidden />
        <SearchX className="relative size-10 text-brand-blue" aria-hidden />
      </div>
      <p className="font-heading text-sm font-medium tracking-[0.28em] text-brand-gold" dir="ltr">404</p>
      <h1 id="not-found-title" className="font-heading mt-3 text-3xl font-medium text-brand-navy sm:text-4xl dark:text-foreground">هذه الصفحة خارج المسار</h1>
      <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-7">قد يكون الرابط قد تغيّر أو لم يعد متاحًا. يمكنك العودة إلى مساحة العمل أو الرجوع للصفحة السابقة ومتابعة عملك.</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-navy px-5 text-sm font-medium text-white transition-colors hover:bg-brand-blue focus-visible:ring-3"><LayoutDashboard className="size-4" />العودة إلى مساحة العمل</Link>
        <Link href="/settings" className="border-border bg-card focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg border px-5 text-sm font-medium text-brand-navy transition-colors hover:bg-muted focus-visible:ring-3 dark:text-foreground"><ArrowRight className="size-4" />المؤسسة والإعدادات</Link>
      </div>
      <p className="text-muted-foreground mt-12 text-xs">أكاديمية السلام المهني · تطوير المهارات، بناء المستقبل</p>
    </section>
  </main>
}
