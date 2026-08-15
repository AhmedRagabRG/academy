import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { programBatchesNavigation } from "@/features/program-batches/config/navigation"
export const academicCatalogNavigation: NavigationItem = {
  id: "academic-catalog",
  title: "المسارات الأكاديمية",
  titleKey: "nav.academicCatalog",
  iconKey: "catalog",
  route: "/academic-catalog",
  permissionKey: "catalog.view" as PermissionKey,
  children: [
    {
      id: "catalog-products",
      title: "المنتجات الأكاديمية",
      titleKey: "nav.catalogProducts",
      iconKey: "products",
      route: "/academic-catalog/products",
      permissionKey: "catalog.products.view" as PermissionKey,
    },
    {
      id: "catalog-types",
      title: "أنواع المنتجات",
      titleKey: "nav.catalogTypes",
      iconKey: "productTypes",
      route: "/academic-catalog/product-types",
      permissionKey: "catalog.types.view" as PermissionKey,
    },
    {
      id: "catalog-categories",
      title: "التصنيفات",
      titleKey: "nav.catalogCategories",
      iconKey: "categories",
      route: "/academic-catalog/categories",
      permissionKey: "catalog.categories.view" as PermissionKey,
    },
    programBatchesNavigation,
  ],
}
