import { httpStudentFinanceService } from "./http-student-finance-service"
import { studentFinanceService as mockStudentFinanceService } from "./mock-student-finance-service"
import type { StudentFinanceService } from "./student-finance-service"
import { useMockServices } from "@/shared/config/service-mode"

/**
 * The implementation the screens run against — the API unless mocks are on.
 *
 * Resolved per call rather than bound once at module evaluation. This module
 * sits inside an import cycle (`student-workspace-tabs → student-finance →
 * create-invoice-screen → use-invoices → here → mock service →
 * finance-dependency-adapters → students → student-workspace-tabs`), so when it
 * is evaluated first the mock's export is still in its temporal dead zone. A
 * plain ternary would capture `undefined` for the lifetime of the process;
 * reading through the proxy defers the choice until the first actual call, by
 * which point both modules are initialized.
 */
const resolve = (): StudentFinanceService =>
  useMockServices ? mockStudentFinanceService : httpStudentFinanceService

export const studentFinanceService: StudentFinanceService = new Proxy(
  {} as StudentFinanceService,
  {
    get(_target, property, receiver) {
      const value = Reflect.get(
        resolve() as object,
        property,
        receiver
      ) as unknown
      // Methods are bound to the implementation so `this` inside the service —
      // which several commands use to re-read the record they just wrote —
      // still refers to the service and not to the proxy.
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(resolve())
        : value
    },
    has: (_target, property) => property in (resolve() as object),
  }
)
