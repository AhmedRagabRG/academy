import { ServiceError } from "@/shared/types/foundation"

export function toServiceError(error: unknown) {
  return error instanceof ServiceError
    ? error
    : new ServiceError("unknown", "حدث خطأ غير متوقع", true)
}
