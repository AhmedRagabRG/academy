import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const REDUCTION_KINDS = ['percentage', 'amount'] as const;

export class ApplyDiscountDto {
  @ApiProperty({ enum: REDUCTION_KINDS })
  @IsIn(REDUCTION_KINDS)
  kind!: (typeof REDUCTION_KINDS)[number];

  /** A percentage ("10.5") or a money amount ("250.00"), per `kind`. */
  @ApiProperty({ example: '10.5' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'value must be a positive decimal string',
  })
  value!: string;

  @ApiProperty({ minLength: 3, maxLength: 255 })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
