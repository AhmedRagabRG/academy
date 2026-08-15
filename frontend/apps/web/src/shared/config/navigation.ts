import type { NavigationIconKey } from "./icon-registry"
import type { PermissionKey } from "@/shared/types/foundation"

export interface NavigationItem {
  id: string
  title: string
  titleKey: string
  iconKey: NavigationIconKey
  route?: string
  permissionKey?: PermissionKey
  children?: readonly NavigationItem[]
}
