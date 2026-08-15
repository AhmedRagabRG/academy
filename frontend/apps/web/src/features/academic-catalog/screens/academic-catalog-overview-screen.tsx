import Link from "next/link"
import { ArrowLeft, BookOpen, Boxes, FolderTree } from "lucide-react"
import { Card } from "@/shared/components/layout/card"
import { CatalogPage } from "../components/catalog-page"
const cards = [
  {
    title: "المنتجات الأكاديمية",
    description: "إنشاء المنتجات وإدارتها والتحكم في دورة حياتها.",
    href: "/academic-catalog/products",
    icon: BookOpen,
  },
  {
    title: "أنواع المنتجات",
    description: "تحديد الحقول الأكاديمية المناسبة لكل نوع.",
    href: "/academic-catalog/product-types",
    icon: Boxes,
  },
  {
    title: "التصنيفات",
    description: "تنظيم المنتجات ضمن تصنيفات ديناميكية.",
    href: "/academic-catalog/categories",
    icon: FolderTree,
  },
]
export function AcademicCatalogOverviewScreen() {
  return (
    <CatalogPage
      permission="catalog.view"
      title="المسارات الأكاديمية"
      description="المصدر المركزي للعروض التعليمية والمعلومات الأكاديمية والتجارية."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group focus-visible:outline-none"
          >
            <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-brand-blue/40 group-focus-visible:ring-2">
              <div className="mb-5 flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-lg bg-brand-navy text-white">
                  <Icon />
                </span>
                <ArrowLeft className="size-5 text-brand-gold" />
              </div>
              <h2 className="font-heading text-lg font-bold text-brand-navy dark:text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </CatalogPage>
  )
}
