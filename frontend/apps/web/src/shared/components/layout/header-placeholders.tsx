import { Bell, Search } from "lucide-react"

export function HeaderPlaceholders() {
  return <div className="flex gap-1" aria-label="ميزات غير متاحة حاليًا"><button disabled title="البحث قريبًا" aria-label="البحث غير متاح حاليًا" className="grid size-9 place-items-center rounded-lg opacity-55"><Search className="size-4" /></button><button disabled title="الإشعارات قريبًا" aria-label="الإشعارات غير متاحة حاليًا" className="grid size-9 place-items-center rounded-lg opacity-55"><Bell className="size-4" /></button></div>
}
