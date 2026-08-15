import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty()
  @IsUUID()
  invoiceId!: string;

  @ApiProperty({ example: '1500.00' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message:
      'amount must be a decimal string with up to 2 decimal places (e.g., "100.50")',
  })
  amount!: string;

  @IsDateString({ strict: true }, { message: 'paymentDate must be in YYYY-MM-DD format' })
  paymentDate!: string;

  @IsString()
  methodId!: string;

  @IsOptional()
  @IsUUID()
  installmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes must not exceed 500 characters' })
  notes?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
