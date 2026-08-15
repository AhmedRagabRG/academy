import type { Metadata } from "next"
import { ExpenseSubCategoriesScreen } from "@/features/accounting"

export const metadata: Metadata = { title: "التصنيفات الفرعية" }

export default function Page() {
  return <ExpenseSubCategoriesScreen />
}
