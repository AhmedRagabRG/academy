export interface CallerContext {
  accountId: string;
  displayName: string;
  email: string;
  sessionId: string;
  roles: { id: string; code: string; displayName: string }[];
  permissionKeys: string[];
  /** @deprecated Transitional compatibility only; new code uses roles/permissionKeys. */
  role?: { id: string; code: string; permissionKeys: string[] };
  organizationWide: boolean;
  /**
   * Branches this account is confined to. **Empty means unrestricted**, not
   * "no access": every account predating branches has an empty array, and the
   * column had to be addable to a live database without locking anyone out.
   * `organizationWide` also bypasses the restriction.
   */
  branchIds: string[];
  authenticatedAt: string;
}
export const EMPTY_CALLER_CONTEXT: CallerContext = {
  accountId: '',
  displayName: '',
  email: '',
  sessionId: '',
  roles: [],
  permissionKeys: [],
  organizationWide: false,
  branchIds: [],
  authenticatedAt: '',
};
