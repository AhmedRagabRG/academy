"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { ticketService } from "../services/active-ticket-service"
import { ticketKeys } from "../services/ticket-query-keys"
import type { CreateTicketInput, TicketActor } from "../types/commands"
import type { TicketId, TicketPriority, TicketStatus } from "../types/common"

export function useTicketMutations(actor: TicketActor, scope: string) {
  const client = useQueryClient()
  const refresh = async (id?: TicketId) => { await client.invalidateQueries({ queryKey: ticketKeys.all }); if (id) await client.invalidateQueries({ queryKey: ticketKeys.detail(scope, id) }) }
  const useActionMutation = <T,>(fn: (value: T) => Promise<unknown>, success: string) => useMutation({ mutationFn: fn, onSuccess: async (_, value) => { feedback.success(success); await refresh((value as { id?: TicketId }).id) }, onError: (error: Error) => feedback.error(error.message) })
  return {
    create: useActionMutation<CreateTicketInput>((input) => ticketService.createTicket(input, actor), "تم إنشاء التذكرة"),
    status: useActionMutation<{ id: TicketId; status: Exclude<TicketStatus, "archived">; version: number }>((v) => ticketService.changeStatus(v.id, v.status, v.version, actor), "تم تحديث الحالة"),
    priority: useActionMutation<{ id: TicketId; priority: TicketPriority; version: number }>((v) => ticketService.changePriority(v.id, v.priority, v.version, actor), "تم تحديث الأولوية"),
    assignment: useActionMutation<{ id: TicketId; teamId?: string; employeeId?: string; version: number }>((v) => ticketService.changeAssignment(v.id, { teamId: v.teamId, employeeId: v.employeeId }, v.version, actor), "تم تحديث الإسناد"),
    comment: useActionMutation<{ id: TicketId; message: string }>((v) => ticketService.addComment(v.id, v.message, actor), "تمت إضافة التعليق"),
    editComment: useActionMutation<{ id: TicketId; commentId: string; message: string }>((v) => ticketService.editComment(v.id, v.commentId, v.message, actor), "تم تعديل التعليق"),
    deleteComment: useActionMutation<{ id: TicketId; commentId: string }>((v) => ticketService.deleteComment(v.id, v.commentId, actor), "تم حذف التعليق"),
    archive: useActionMutation<{ id: TicketId; version: number }>((v) => ticketService.archiveTicket(v.id, v.version, actor), "تمت أرشفة التذكرة"),
    restore: useActionMutation<{ id: TicketId; version: number }>((v) => ticketService.restoreTicket(v.id, v.version, actor), "تمت استعادة التذكرة"),
    remove: useActionMutation<{ id: TicketId }>(async (v) => ticketService.deleteTicket(v.id, actor), "تم حذف التذكرة"),
    upload: useActionMutation<{ id: TicketId; file: File }>((v) => ticketService.uploadAttachment(v.id, v.file, actor), "تم إرفاق الملف"),
  }
}
