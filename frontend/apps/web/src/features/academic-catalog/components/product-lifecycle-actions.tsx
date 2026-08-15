"use client"
import { Button } from "@workspace/ui/components/button"
import { useState } from "react"
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog"
import { allowedTransitions } from "../utils/catalog-rules"
import type { ProductDetail } from "../types/domain"
import type { ProductStatus } from "../types/common"
import { useProductMutations } from "../hooks/use-academic-catalog"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
const labels = {
  active: "تفعيل",
  hidden: "إخفاء",
  closed: "إغلاق",
  archived: "أرشفة",
  draft: "مسودة",
}
export function ProductLifecycleActions({
  product,
}: {
  product: ProductDetail
}) {
  const mutation = useProductMutations().transition
  const canActivate = useMockPermission("catalog.products.activate")
  const canArchive = useMockPermission("catalog.products.archive")
  const [selected, setSelected] = useState<ProductStatus>()
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {allowedTransitions[product.status]
          .filter((status) =>
            status === "archived" ? canArchive : canActivate
          )
          .map((status) => (
            <Button
              key={status}
              variant={status === "archived" ? "destructive" : "outline"}
              disabled={mutation.isPending}
              onClick={() => setSelected(status)}
            >
              {labels[status]}
            </Button>
          ))}
      </div>
      <ConfirmDialog
        open={Boolean(selected)}
        title={`تأكيد ${selected ? labels[selected] : "تغيير الحالة"}`}
        description="سيتم تحديث توفر المنتج وتسجيل الحدث في سجل دورة الحياة."
        confirmLabel={selected ? labels[selected] : "تأكيد"}
        destructive={selected === "archived"}
        pending={mutation.isPending}
        onClose={() => setSelected(undefined)}
        onConfirm={() => {
          if (!selected) return
          mutation.mutate(
            {
              id: product.id,
              toStatus: selected,
              reason:
                selected === "active"
                  ? undefined
                  : "تغيير إداري من شاشة المنتج",
              expectedVersion: product.version,
            },
            { onSuccess: () => setSelected(undefined) }
          )
        }}
      />
    </>
  )
}
