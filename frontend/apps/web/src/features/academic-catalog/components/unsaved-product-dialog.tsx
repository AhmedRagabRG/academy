import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog"
export function UnsavedProductDialog({
  open,
  onLeave,
  onClose,
}: {
  open: boolean
  onLeave: () => void
  onClose: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      title="لديك تغييرات غير محفوظة"
      description="ستفقد التغييرات إذا غادرت قبل الحفظ."
      confirmLabel="مغادرة"
      destructive
      onConfirm={onLeave}
      onClose={onClose}
    />
  )
}
