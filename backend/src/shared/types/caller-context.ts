export interface CallerContext {
  accountId: string;
  displayName: string;
  email: string;
  sessionId: string;
  roles: { id: string; code: string; displayName: string }[];
  permissionKeys: string[];
  /** @deprecated Transitional compatibility only; new code uses roles/permissionKeys. */
  role?: { id: string; code: string; permissionKeys: string[] };
  authorizedBranchIds: string[];
  organizationWide: boolean;
  authenticatedAt: string;
}
export const EMPTY_CALLER_CONTEXT: CallerContext = {
  accountId: '',
  displayName: '',
  email: '',
  sessionId: '',
  roles: [],
  permissionKeys: [],
  authorizedBranchIds: [],
  organizationWide: false,
  authenticatedAt: '',
};
