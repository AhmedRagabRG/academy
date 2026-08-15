import type { StudentServiceContext } from "../utils/students-scope"
import type { StudentFinanceReader } from "./students-dependency-readers"
import {
  createMockStudentFinanceReader,
  defaultStudentFinanceReader,
} from "./mock-student-finance-reader"
import { resolveStudentFinanceReader } from "./student-finance-registry"
import { defaultStudentContext } from "../utils/students-scope"

export type FailureMode =
  | "none"
  | "list"
  | "detail"
  | "documents"
  | "notes"
  | "timeline"
  | "all"

export type FinanceMode =
  /** Whatever Student Finance registered, or the honest default when nothing has. */
  | "registered"
  /** Explicitly behave as though no finance module exists. */
  | "absent"
  | "available"
  | "unavailable"
  | "source-error"
  | "timeout"

export interface StudentScenarioState {
  latencyMs: number
  failure: FailureMode
  /** Forces the next command to report a version conflict. */
  forceConflict: boolean
  finance: FinanceMode
  scale: boolean
  scaleSize: number
  context: StudentServiceContext
}

const initial = (): StudentScenarioState => ({
  latencyMs: 0,
  failure: "none",
  forceConflict: false,
  finance: "registered",
  scale: false,
  scaleSize: 20_000,
  context: defaultStudentContext,
})

let state = initial()

/**
 * Deterministic control surface for latency, failure, permission, branch-scope,
 * conflict, and finance-availability modes. Tests and the quickstart scenarios
 * drive the module through this rather than through component internals.
 */
export const studentScenarios = {
  read(): StudentScenarioState {
    return state
  },
  reset() {
    state = initial()
  },
  setLatency(latencyMs: number) {
    state = { ...state, latencyMs }
  },
  failNext(failure: FailureMode) {
    state = { ...state, failure }
  },
  setConflict(forceConflict: boolean) {
    state = { ...state, forceConflict }
  },
  setFinance(finance: FinanceMode) {
    state = { ...state, finance }
  },
  useScale(scale: boolean, scaleSize = state.scaleSize) {
    state = { ...state, scale, scaleSize }
  },
  setContext(context: Partial<StudentServiceContext>) {
    state = { ...state, context: { ...state.context, ...context } }
  },
  /** Restrict the acting employee to specific branches. */
  scopeToBranches(branchIds: string[]) {
    state = {
      ...state,
      context: {
        ...state.context,
        organizationWide: false,
        authorizedBranchIds: branchIds,
        scopeFingerprint: `${state.context.organizationId}:${[...branchIds].sort().join(",")}`,
      },
    }
  },
  /** Remove permissions from the acting employee. */
  withoutPermissions(permissions: string[]) {
    const removed = new Set(permissions)
    state = {
      ...state,
      context: {
        ...state.context,
        permissions: state.context.permissions.filter(
          (permission) => !removed.has(permission)
        ),
      },
    }
  },
}

export function scenarioContext(): StudentServiceContext {
  return state.context
}

export function scenarioFinanceReader(): StudentFinanceReader {
  switch (state.finance) {
    case "available":
      return createMockStudentFinanceReader({ mode: "available" })
    case "source-error":
      return createMockStudentFinanceReader({ mode: "source-error" })
    case "timeout":
      return createMockStudentFinanceReader({ mode: "timeout" })
    case "absent":
      // An explicit scenario: behave as though no finance module exists at all.
      return defaultStudentFinanceReader
    case "unavailable":
    case "registered":
    default:
      // Whatever Student Finance registered at the composition root — and the
      // honest "unavailable" default when nothing has.
      return resolveStudentFinanceReader()
  }
}

export async function scenarioDelay(): Promise<void> {
  if (state.latencyMs > 0)
    await new Promise((resolve) => setTimeout(resolve, state.latencyMs))
}

export function shouldFail(area: Exclude<FailureMode, "none" | "all">): boolean {
  return state.failure === "all" || state.failure === area
}
