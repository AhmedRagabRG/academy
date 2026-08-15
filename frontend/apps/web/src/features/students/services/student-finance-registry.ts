import type { StudentFinanceReader } from "./students-dependency-readers"
import { defaultStudentFinanceReader } from "./mock-student-finance-reader"

/**
 * Registration point for the finance reader.
 *
 * Student Management must not import Student Finance — that direction would close
 * a dependency cycle, since Finance reads Students. Instead Finance registers its
 * reader here at the composition root, and Students resolves whatever is
 * registered (plan.md, Complexity Tracking).
 *
 * Nothing changes when no one registers: the resolver falls back to the wired
 * default, which honestly reports the module as absent rather than presenting
 * zeroes as facts.
 */
let registered: StudentFinanceReader | undefined

export function registerStudentFinanceReader(reader: StudentFinanceReader): void {
  registered = reader
}

export function resolveStudentFinanceReader(): StudentFinanceReader {
  return registered ?? defaultStudentFinanceReader
}

/** Restores the default. Used by tests between cases. */
export function resetStudentFinanceReader(): void {
  registered = undefined
}
