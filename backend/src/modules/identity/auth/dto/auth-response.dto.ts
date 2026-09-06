export class EmptyBodyDto {}
export class AuthResponseDto {
  employee!: unknown;
  roles!: unknown[];
  permissionKeys!: string[];
  organizationWide!: boolean;
  authenticatedAt!: string;
}
