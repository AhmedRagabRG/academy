import Link from "next/link"
import { Building2, KeyRound, Settings2, UsersRound } from "lucide-react"
import { Card } from "@/shared/components/layout/card"
import { SettingsPage } from "../components/settings-page"

const sections = [
  { href: "/settings/organization", title: "ملف المؤسسة", description: "الهوية وبيانات التواصل", icon: Building2 },
  { href: "/settings/users", title: "المستخدمون", description: "حسابات الموظفين", icon: UsersRound },
  { href: "/settings/permissions", title: "الوصول والصلاحيات", description: "الأدوار ومصفوفة الصلاحيات", icon: KeyRound },
  { href: "/settings/general", title: "الإعدادات العامة", description: "اللغة والعملات والافتراضيات", icon: Settings2 },
]

export function SettingsOverviewScreen() {
  return (
    <SettingsPage
      title="المؤسسة والإعدادات"
      description="مركز التحكم الإداري الذي تعتمد عليه كل وحدات العمليات التعليمية."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group focus-visible:outline-none">
            <Card className="h-full transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-lg font-medium text-brand-navy dark:text-foreground">
                    {title}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm">{description}</p>
                </div>
                <Icon className="size-5 text-brand-gold" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </SettingsPage>
  )
}
