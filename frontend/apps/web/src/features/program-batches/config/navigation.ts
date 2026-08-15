import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
export const programBatchesNavigation: NavigationItem = {
  id: "program-batches",
  title: "دفعات البرامج",
  titleKey: "nav.programBatches",
  iconKey: "products",
  route: "/academic-catalog/programs",
  permissionKey: "batches.view" as PermissionKey,
}
