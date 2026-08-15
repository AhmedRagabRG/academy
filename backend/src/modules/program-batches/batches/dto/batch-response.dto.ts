import { ApiProperty } from '@nestjs/swagger';

export class CapacityResponseDto {
  maximumStudents!: number;
  currentStudents!: number;
  availableSeats!: number;
  @ApiProperty({ enum: ['available', 'nearly-full', 'full', 'over-capacity'] })
  status!: string;
}

export class ProgramBatchResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) programId!: string;
  name!: { ar: string; en?: string };
  code!: string;
  status!: string;
  version!: number;
  capacity!: CapacityResponseDto;
}

export class BatchReadinessResponseDto {
  ready!: boolean;
  batchVersion!: number;
  findings!: Array<{
    code: string;
    section: string;
    field: string;
    message: string;
  }>;
}

export class BatchEligibilityResponseDto {
  eligible!: boolean;
  reasons!: string[];
  availableSeats!: number;
  financialRevisionId!: string;
  batchVersion!: number;
}
