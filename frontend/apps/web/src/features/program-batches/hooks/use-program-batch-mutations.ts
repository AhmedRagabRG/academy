"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { programBatchService as service } from "../services/active-program-batch-service"
import { batchKeys } from "../services/program-batch-query-keys"
export function useBatchMutations() {
  const client = useQueryClient()
  const done = (batch: { programId: string; id: string }) => {
    client.setQueryData(batchKeys.detail(batch.programId, batch.id), batch)
    void client.invalidateQueries({
      queryKey: [...batchKeys.all, "list", batch.programId],
    })
  }
  return {
    create: useMutation({
      mutationFn: service.create,
      onSuccess: (b) => {
        done(b)
        toast.success("تم إنشاء الدفعة")
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: service.update,
      onSuccess: (b) => {
        done(b)
        toast.success("تم حفظ الدفعة")
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    transition: useMutation({
      mutationFn: service.transition,
      onSuccess: (b) => {
        done(b)
        void client.invalidateQueries({ queryKey: batchKeys.lifecycle(b.id) })
        toast.success("تم تحديث حالة الدفعة")
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  }
}
