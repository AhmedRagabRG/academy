import type { Metadata } from "next"
import { ProgramsIndexScreen } from "@/features/program-batches"

export const metadata: Metadata = { title: "دفعات البرامج" }

export default function Page() {
  return <ProgramsIndexScreen />
}
