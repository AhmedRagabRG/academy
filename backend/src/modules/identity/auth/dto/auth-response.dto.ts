export class EmptyBodyDto {}
export class AuthResponseDto {
  employee!: unknown;
  roles!: unknown[];
  permissionKeys!: string[];
  authorizedBranchIds!: string[];
  organizationWide!: boolean;
  authenticatedAt!: string;
}
