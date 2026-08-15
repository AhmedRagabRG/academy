import { ApiProperty } from '@nestjs/swagger';

/**
 * Documents the deliberately narrow surface: identifiers, dates, amounts and
 * statuses only. If a future field would add a name, address, identifier or
 * note, it does not belong in this contract.
 */
export class AccountingContextDto {
  @ApiProperty({ type: [Object] }) invoices!: unknown[];
  @ApiProperty({ type: [Object] }) payments!: unknown[];
  @ApiProperty({ type: [Object] }) refunds!: unknown[];
  @ApiProperty({ format: 'date-time' }) asOf!: string;
  @ApiProperty({ example: 'SAR' }) currency!: string;
  @ApiProperty({ example: 2 }) precision!: number;
}
