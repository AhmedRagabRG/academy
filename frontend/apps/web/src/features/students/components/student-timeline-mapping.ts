import {
  Archive,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  FileUp,
  GraduationCap,
  RefreshCw,
  ScrollText,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { TimelineCategory } from "../types/common"
import type { TimelineTone } from "@/shared/components/data-display/timeline"
import { timelineCopy } from "../config/students-copy"

interface CategoryPresentation {
  label: string
  icon: LucideIcon
  tone: TimelineTone
}

/**
 * Presentation for every timeline category, including the two reserved for future
 * modules so an event arriving from Finance or Academic renders rather than falling
 * through to a blank row.
 */
export const timelineCategoryPresentation: Record<
  TimelineCategory,
  CategoryPresentation
> = {
  "admission-submitted": {
    label: timelineCopy.categories["admission-submitted"],
    icon: ClipboardList,
    tone: "neutral",
  },
  "admission-approved": {
    label: timelineCopy.categories["admission-approved"],
    icon: ClipboardCheck,
    tone: "success",
  },
  "student-created": {
    label: timelineCopy.categories["student-created"],
    icon: UserPlus,
    tone: "success",
  },
  "enrollment-added": {
    label: timelineCopy.categories["enrollment-added"],
    icon: GraduationCap,
    tone: "success",
  },
  "document-uploaded": {
    label: timelineCopy.categories["document-uploaded"],
    icon: FileUp,
    tone: "neutral",
  },
  "document-replaced": {
    label: timelineCopy.categories["document-replaced"],
    icon: RefreshCw,
    tone: "warning",
  },
  "document-archived": {
    label: timelineCopy.categories["document-archived"],
    icon: Archive,
    tone: "neutral",
  },
  "profile-updated": {
    label: timelineCopy.categories["profile-updated"],
    icon: ScrollText,
    tone: "neutral",
  },
  "status-changed": {
    label: timelineCopy.categories["status-changed"],
    icon: CircleCheck,
    tone: "warning",
  },
  "financial-event": {
    label: timelineCopy.categories["financial-event"],
    icon: Wallet,
    tone: "neutral",
  },
  "academic-event": {
    label: timelineCopy.categories["academic-event"],
    icon: GraduationCap,
    tone: "neutral",
  },
}
