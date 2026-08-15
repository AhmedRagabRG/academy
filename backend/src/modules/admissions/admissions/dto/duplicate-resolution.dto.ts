import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class DuplicateResolutionDto {
  @ApiProperty({ enum: ['use-existing', 'create-exception'] })
  @IsIn(['use-existing', 'create-exception'])
  outcome!: 'use-existing' | 'create-exception';

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf(
    (value: DuplicateResolutionDto) => value.outcome === 'use-existing',
  )
  @IsUUID()
  applicantId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (value: DuplicateResolutionDto) => value.outcome === 'create-exception',
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  private readonly validationSentinel?: never;
}
