import { ApiProperty } from '@nestjs/swagger';
export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  code!: string;
  @ApiProperty()
  displayName!: string;
  @ApiProperty({ type: [String], format: 'uuid' })
  permissionIds!: string[];
}
export class PermissionGroupResponseDto {
  @ApiProperty()
  moduleKey!: string;
  @ApiProperty({ type: [Object] })
  permissions!: unknown[];
}
