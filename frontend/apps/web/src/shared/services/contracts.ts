import type { EmployeeContext } from "@/shared/types/foundation"

export interface SessionService {
  getSession(): Promise<EmployeeContext | null>
  signOut(): Promise<void>
}
