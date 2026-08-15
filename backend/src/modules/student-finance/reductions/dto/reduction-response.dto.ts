import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';
import { REDUCTION_KINDS } from './apply-discount.dto';
import { SCHOLARSHIP_COVERAGES } from './award-scholarship.dto';

export class ReductionActorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class DiscountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() invoiceId!: string;
  @ApiProperty({ enum: REDUCTION_KINDS }) kind!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({
    type: MoneyDto,
    description: 'The monetary effect, already resolved from percentage',
  })
  amount!: MoneyDto;
  @ApiProperty({ type: ReductionActorDto }) approvedBy!: ReductionActorDto;
  @ApiProperty({ format: 'date-time' }) approvedAt!: string;
}

export class ScholarshipResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional({
    description: 'Absent means every enrollment of the student',
  })
  enrollmentId?: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: REDUCTION_KINDS }) kind!: string;
  @ApiProperty({ enum: SCHOLARSHIP_COVERAGES }) coverage!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ type: ReductionActorDto }) approvedBy!: ReductionActorDto;
  @ApiProperty({ format: 'date-time' }) approvedAt!: string;
}
