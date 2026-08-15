import type { EmployeeContext } from "@/shared/types/foundation"

export interface LoginCredentials { email: string; password: string }
export interface AuthService {
  signIn(credentials: LoginCredentials): Promise<EmployeeContext>
  getSession(): Promise<EmployeeContext | null>
  signOut(): Promise<void>
}
