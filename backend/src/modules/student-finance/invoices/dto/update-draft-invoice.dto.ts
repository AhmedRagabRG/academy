import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

const DECIMAL = /^\d+(\.\d{1,4})?$/;

export class ReductionInputDto {
  @ApiProperty({ enum: ['percentage', 'amount'] })
  @IsIn(['percentage', 'amount'], { message: 'نوع الخصم غير صالح' })
  kind!: 'percentage' | 'amount';

  @ApiProperty({ example: '10', description: '0..100 for percentage' })
  @Matches(DECIMAL, { message: 'قيمة رقمية غير صحيحة' })
  value!: string;
}

export class UpdateDraftInvoiceInputDto {
  @ApiPropertyOptional({ example: '18000.00' })
  @IsOptional()
  @Matches(DECIMAL, { message: 'قيمة رقمية غير صحيحة' })
  totalAmount?: string;

  @ApiPropertyOptional({ example: '2026-08-24' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الاستحقاق مطلوب' })
  dueDate?: string;

  @ApiPropertyOptional({ type: ReductionInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReductionInputDto)
  discount?: ReductionInputDto;

  @ApiPropertyOptional({ type: ReductionInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReductionInputDto)
  scholarship?: ReductionInputDto;
}

/**
 * Editable only while the invoice is a draft. `finalAmount`, the reduction
 * totals, `invoiceNumber`, `status`, the issued snapshot and the identity
 * fields are all absent by design — they are server-owned, and accepting them
 * would let a client assert figures the rules do not support.
 */
export class UpdateDraftInvoiceDto {
  @ApiProperty({ type: UpdateDraftInvoiceInputDto })
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateDraftInvoiceInputDto)
  input!: UpdateDraftInvoiceInputDto;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ExpectedVersionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class CancelInvoiceDto extends ExpectedVersionDto {
  @ApiProperty({ example: 'فاتورة مكررة' })
  @Matches(/^.{3,}$/s, { message: 'السبب مطلوب' })
  reason!: string;
}
