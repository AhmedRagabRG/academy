import { z } from "zod"

export const ticketStatusSchema = z.enum(["backlog", "todo", "in-progress", "waiting", "review", "done", "archived"])
export const ticketPrioritySchema = z.enum(["low", "medium", "high", "critical"])
export const createTicketSchema = z.object({
  title: z.string().trim().min(3, "العنوان مطلوب").max(160),
  description: z.string().trim().min(3, "الوصف مطلوب").max(10000),
  status: ticketStatusSchema.exclude(["archived"]),
  priority: ticketPrioritySchema,
  teamId: z.string().optional(),
  employeeId: z.string().optional(),
  customerId: z.string().optional(),
  studentId: z.string().optional(),
  conversationId: z.string().optional(),
  dueAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
})
export const commentSchema = z.object({ message: z.string().trim().min(1, "اكتب تعليقاً").max(4000) })
