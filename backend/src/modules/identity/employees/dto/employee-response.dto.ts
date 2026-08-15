import { ApiProperty } from '@nestjs/swagger';
export class EmployeeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty()
  displayName!: string;
  @ApiProperty({ type: [String], format: 'uuid' })
  roleIds!: string[];
  @ApiProperty({ type: [String] })
  permissionKeys!: string[];
}
export class EffectivePermissionsResponseDto {
  @ApiProperty({ type: [String] }) permissionKeys!: string[];
}
