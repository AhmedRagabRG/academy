import { ApiProperty } from '@nestjs/swagger';

export class LookupOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty({
    description: 'Inactive values are still returned so history keeps its label',
  })
  active!: boolean;
}

export class FinanceLookupsDto {
  @ApiProperty({ type: [LookupOptionDto] }) paymentMethods!: LookupOptionDto[];
  @ApiProperty({ type: [LookupOptionDto] }) chargePurposes!: LookupOptionDto[];
  @ApiProperty({ type: [LookupOptionDto] }) branches!: LookupOptionDto[];
  @ApiProperty({ type: [LookupOptionDto] }) offerings!: LookupOptionDto[];
  @ApiProperty({ type: [LookupOptionDto] }) batches!: LookupOptionDto[];
  @ApiProperty({ type: [String] }) invoiceStatuses!: string[];
  @ApiProperty({ type: [String] }) refundStatuses!: string[];
  @ApiProperty({ type: [Object] }) installmentEligibility!: unknown[];
  @ApiProperty({ type: Object }) discountPolicy!: unknown;
  @ApiProperty({ type: Object }) scholarshipPolicy!: unknown;
  @ApiProperty({ type: Object }) numbering!: unknown;
  @ApiProperty({ type: Object }) duePolicy!: unknown;
  @ApiProperty({ example: 'SAR' }) currency!: string;
  @ApiProperty({ example: 2 }) precision!: number;
}
