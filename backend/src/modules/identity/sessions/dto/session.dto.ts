import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SessionIdDto {
  @IsUUID()
  id!: string;
}
export class SessionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() device!: string;
  @ApiProperty() browser!: string;
  @ApiProperty() ipAddress!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) lastActivityAt!: Date;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
  @ApiProperty() current!: boolean;
}
export class RevokedSessionsResponseDto {
  @ApiProperty() revokedCount!: number;
}
