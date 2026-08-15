import {
  buildScopeFingerprint,
  defaultFinanceContext,
  type FinanceServiceContext,
} from "../utils/finance-scope"

export type FinanceFailureArea =
  | "none"
  | "invoices"
  | "payments"
  | "installments"
  | "refunds"
  | "profile"
  | "timeline"
  | "all"

export interface FinanceScenarioState {
  latencyMs: number
  failure: FinanceFailureArea
  /** Forces the next command to report a version conflict. */
  forceConflict: boolean
  scale: boolean
  scaleSize: number
  /** Fixed clock so overdue derivation is deterministic. */
  now: string
  context: FinanceServiceContext
}

const DEFAULT_NOW = "2026-08-01T12:00:00.000Z"

const initial = (): FinanceScenarioState => ({
  latencyMs: 0,
  failure: "none",
  forceConflict: false,
  scale: false,
  scaleSize: 50_000,
  now: DEFAULT_NOW,
  context: { ...defaultFinanceContext, now: () => DEFAULT_NOW },
})

let state = initial()

/**
 * Deterministic control surface for latency, failure, permission, branch-scope,
 * conflict, clock, and scale modes. Tests and quickstart scenarios drive the
 * module through this rather than through component internals.
 */
export const financeScenarios = {
  read(): FinanceScenarioState {
    return state
  },
  reset() {
    state = initial()
  },
  setLatency(latencyMs: number) {
    state = { ...state, latencyMs }
  },
  failNext(failure: FinanceFailureArea) {
    state = { ...state, failure }
  },
  setConflict(forceConflict: boolean) {
    state = { ...state, forceConflict }
  },
  useScale(scale: boolean, scaleSize = state.scaleSize) {
    state = { ...state, scale, scaleSize }
  },
  /** Moves the clock so overdue boundaries can be tested exactly. */
  setNow(now: string) {
    state = { ...state, now, context: { ...state.context, now: () => now } }
  },
  setContext(patch: Partial<FinanceServiceContext>) {
    state = { ...state, context: { ...state.context, ...patch } }
  },
  /** Restricts the acting user to specific branches. */
  scopeToBranches(branchIds: string[]) {
    const next = {
      ...state.context,
      organizationWide: false,
      authorizedBranchIds: branchIds,
    }
    state = {
      ...state,
      context: {
        ...next,
        scopeFingerprint: buildScopeFingerprint(next),
      },
    }
  },
  /** Removes permissions from the acting user. */
  withoutPermissions(permissions: string[]) {
    const removed = new Set(permissions)
    const next = {
      ...state.context,
      permissions: state.context.permissions.filter(
        (permission) => !removed.has(permission)
      ),
    }
    state = {
      ...state,
      context: { ...next, scopeFingerprint: buildScopeFingerprint(next) },
    }
  },
  /** Restricts the acting user to exactly the listed permissions. */
  onlyPermissions(permissions: string[]) {
    const next = { ...state.context, permissions }
    state = {
      ...state,
      context: { ...next, scopeFingerprint: buildScopeFingerprint(next) },
    }
  },
}

export function scenarioContext(): FinanceServiceContext {
  return state.context
}

export function scenarioNow(): string {
  return state.now
}

export async function scenarioDelay(): Promise<void> {
  if (state.latencyMs > 0)
    await new Promise((resolve) => setTimeout(resolve, state.latencyMs))
}

export function shouldFail(
  area: Exclude<FinanceFailureArea, "none" | "all">
): boolean {
  return state.failure === "all" || state.failure === area
}
