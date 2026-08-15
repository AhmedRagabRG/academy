import {
  buildScopeFingerprint,
  createAccountingContext,
  type AccountingServiceContext,
} from "../utils/accounting-scope"
import { allAccountingPermissions } from "../config/accounting-permissions"

export type AccountingFailureArea =
  | "none"
  | "requests"
  | "detail"
  | "categories"
  | "dashboard"
  | "history"
  | "all"

export interface AccountingScenarioState {
  latencyMs: number
  failure: AccountingFailureArea
  /** Forces the next command to report a version conflict. */
  forceConflict: boolean
  scale: boolean
  scaleSize: number
  /** Fixed clock, so timestamps and month derivation stay deterministic. */
  now: string
  context: AccountingServiceContext
}

const DEFAULT_NOW = "2026-08-01T12:00:00.000Z"

const initial = (): AccountingScenarioState => ({
  latencyMs: 0,
  failure: "none",
  forceConflict: false,
  scale: false,
  scaleSize: 20_000,
  now: DEFAULT_NOW,
  context: createAccountingContext({
    permissions: [...allAccountingPermissions],
    organizationWide: true,
    now: () => DEFAULT_NOW,
  }),
})

let state = initial()

/**
 * Deterministic control surface for latency, failure, permission, scope,
 * conflict, clock, and scale. Tests and the quickstart drive the module through
 * this rather than through component internals.
 */
export const accountingScenarios = {
  read(): AccountingScenarioState {
    return state
  },
  reset() {
    state = initial()
  },
  setLatency(latencyMs: number) {
    state = { ...state, latencyMs }
  },
  failNext(failure: AccountingFailureArea) {
    state = { ...state, failure }
  },
  setConflict(forceConflict: boolean) {
    state = { ...state, forceConflict }
  },
  useScale(scale: boolean, scaleSize = state.scaleSize) {
    state = { ...state, scale, scaleSize }
  },
  setNow(now: string) {
    state = { ...state, now, context: { ...state.context, now: () => now } }
  },
  setContext(patch: Partial<AccountingServiceContext>) {
    const next = { ...state.context, ...patch }
    state = {
      ...state,
      context: { ...next, scopeFingerprint: buildScopeFingerprint(next) },
    }
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
      context: { ...next, scopeFingerprint: buildScopeFingerprint(next) },
    }
  },
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

export function scenarioContext(): AccountingServiceContext {
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
  area: Exclude<AccountingFailureArea, "none" | "all">
): boolean {
  return state.failure === "all" || state.failure === area
}
