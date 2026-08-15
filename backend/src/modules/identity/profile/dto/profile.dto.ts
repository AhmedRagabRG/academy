import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'أحمد محمد' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;
  @ApiPropertyOptional({ example: '+201001234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() avatar?: Record<
    string,
    unknown
  >;
  @IsInt() @Min(1) expectedVersion!: number;
}
