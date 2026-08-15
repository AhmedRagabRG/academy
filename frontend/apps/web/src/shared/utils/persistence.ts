import { z } from "zod"

export function readVersionedStorage<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = schema.safeParse(JSON.parse(raw))
    if (!parsed.success) window.localStorage.removeItem(key)
    return parsed.success ? parsed.data : null
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}
