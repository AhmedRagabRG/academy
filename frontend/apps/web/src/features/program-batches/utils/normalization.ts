export const normalizeCode = (value: string) => value.trim().toUpperCase()
export const normalizeSearch = (value = "") =>
  value.trim().toLocaleLowerCase("ar")
export const clone = <T>(value: T): T => structuredClone(value)
export const compareDate = (a?: string, b?: string) =>
  a && b ? a.localeCompare(b) : 0
export const moneyNumber = (value: string) => Math.round(Number(value) * 100)
