import { useMockServices } from "@/shared/config/service-mode"
import type { AccountingService } from "./accounting-service"
import { httpAccountingService } from "./http-accounting-service"
import { accountingService as mockAccountingService } from "./mock-accounting-service"

/** The implementation the screens run against — the API unless mocks are on. */
export const accountingService: AccountingService = useMockServices
  ? mockAccountingService
  : httpAccountingService
