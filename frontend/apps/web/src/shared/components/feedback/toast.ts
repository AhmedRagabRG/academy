import { toast } from "sonner"

export const feedback = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
}
