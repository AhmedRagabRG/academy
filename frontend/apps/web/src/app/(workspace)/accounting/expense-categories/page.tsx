import type { Metadata } from "next"
import { ExpenseCategoriesScreen } from "@/features/accounting"

export const metadata: Metadata = { title: "تصنيفات المصروفات" }

export default function Page() {
  return <ExpenseCategoriesScreen />
}
