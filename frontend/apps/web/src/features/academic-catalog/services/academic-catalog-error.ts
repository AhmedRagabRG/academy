export type CatalogErrorKind =
  | "validation"
  | "duplicate"
  | "conflict"
  | "dependency"
  | "transition"
  | "forbidden"
  | "not-found"
  | "unavailable"
  | "asset"
  | "unexpected"
export class AcademicCatalogError extends Error {
  constructor(
    public code: string,
    public kind: CatalogErrorKind,
    message: string,
    public fieldErrors?: Record<string, string>,
    public retryable = false
  ) {
    super(message)
    this.name = "AcademicCatalogError"
  }
}
