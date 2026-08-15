import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { REDUCTION_KINDS } from './apply-discount.dto';

export const SCHOLARSHIP_COVERAGES = [
  'full-tuition',
  'partial-tuition',
] as const;

export class AwardScholarshipDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  /** Absent means the scholarship covers every enrollment of the student. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @ApiProperty({ minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: REDUCTION_KINDS })
  @IsIn(REDUCTION_KINDS)
  kind!: (typeof REDUCTION_KINDS)[number];

  @ApiProperty({ example: '100' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'value must be a positive decimal string',
  })
  value!: string;

  @ApiProperty({ enum: SCHOLARSHIP_COVERAGES })
  @IsIn(SCHOLARSHIP_COVERAGES)
  coverage!: (typeof SCHOLARSHIP_COVERAGES)[number];

  @ApiProperty({ minLength: 3, maxLength: 255 })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}
