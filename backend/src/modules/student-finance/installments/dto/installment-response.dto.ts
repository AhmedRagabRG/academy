import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';
import { INSTALLMENT_STATUSES } from './generate-installment-plan.dto';

/**
 * `paidAmount`, `remaining` and `status` are derived from the balance view on
 * every read — they are never stored, so they cannot drift from the payments
 * that produced them.
 */
export class InstallmentRowDto {
  @ApiProperty() id!: string;
  @ApiProperty() invoiceId!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentCode!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() branchId!: string;
  @ApiProperty({ example: 1 }) sequence!: number;
  @ApiProperty({ example: '2026-09-01' }) dueDate!: string;
  @ApiProperty({ type: MoneyDto }) amount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) paidAmount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) remaining!: MoneyDto;
  @ApiProperty({ enum: INSTALLMENT_STATUSES }) status!: string;
}
