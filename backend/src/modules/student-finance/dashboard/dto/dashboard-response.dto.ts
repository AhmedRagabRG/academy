import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';

export class DashboardSummaryDto {
  @ApiProperty({ type: MoneyDto }) invoiced!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) collected!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) outstanding!: MoneyDto;
  @ApiProperty({ example: 12 }) unsettledInvoices!: number;
  @ApiProperty({
    description:
      'True only when no invoice matched at all; an all-cancelled set reports zeros instead',
  })
  hasNoRecords!: boolean;
  @ApiProperty({ format: 'date-time' }) asOf!: string;
}
