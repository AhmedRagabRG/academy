import { TabletNavigation } from "./tablet-navigation"
import { UserMenu } from "./user-menu"
import { Breadcrumbs } from "./breadcrumbs"
import { BrandLogo } from "@/shared/components/brand/brand-logo"

export function Header() {
  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <TabletNavigation />
        <BrandLogo priority variant="mark" className="size-9 lg:hidden" />
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        {/* <ThemeSwitcher /> */}
        <span className="mx-1 hidden h-7 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  )
}
