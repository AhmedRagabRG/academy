import { IsOptional, IsUUID, Matches } from 'class-validator';

export class BatchEligibilityQueryDto {
  @IsUUID() branchId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) today!: string;
}

export class OptionalEvaluationQueryDto {
  @IsOptional() @IsUUID() branchId?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) today!: string;
}
