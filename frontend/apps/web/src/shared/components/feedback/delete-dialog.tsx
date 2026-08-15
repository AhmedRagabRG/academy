"use client"
import { ConfirmDialog } from "./confirm-dialog"
export function DeleteDialog(props: Omit<React.ComponentProps<typeof ConfirmDialog>, "destructive" | "confirmLabel">) { return <ConfirmDialog {...props} destructive confirmLabel="حذف" /> }
