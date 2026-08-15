import { httpAuthService } from "./http-auth-service"
import { mockAuthService } from "./mock-auth-service"
import { useMockServices } from "@/shared/config/service-mode"

export const authService = useMockServices ? mockAuthService : httpAuthService
