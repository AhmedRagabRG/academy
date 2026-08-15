"use client"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { allTicketPermissions } from "../config/ticket-permissions"
import type { TicketActor } from "../types/commands"

export function useTicketActor(): TicketActor {
  const context = useEmployeeContextStore((state) => state.context)
  if (!context) return { userId: "employee-demo", name: "أحمد محمد", employeeId: "employee-demo", teamIds: ["team-support"], permissions: allTicketPermissions }
  return { userId: context.employee.id, name: context.employee.displayName, employeeId: context.employee.id, teamIds: ["team-support"], permissions: context.role.permissionKeys }
}
export function actorFingerprint(actor: TicketActor) { return [actor.userId, ...actor.permissions].join(":") }
