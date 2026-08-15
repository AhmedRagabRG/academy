import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/pagination/page-query.dto';

export class ListAdmissionsDto extends PageQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() offeringId?: string;
  @IsOptional() @IsUUID() batchId?: string;
  @IsOptional() @IsUUID() admissionsEmployeeId?: string;
  @IsOptional() @IsUUID() customerServiceEmployeeId?: string;
  @IsOptional() @IsUUID() customerServiceManagerId?: string;

  @IsOptional()
  @IsIn([
    'draft',
    'submitted',
    'under-review',
    'approved',
    'rejected',
    'enrolled',
    'archived',
  ])
  status?: string;

  @IsOptional()
  @IsIn(['updatedAt', 'applicantName', 'reference', 'status'])
  sortBy?: 'updatedAt' | 'applicantName' | 'reference' | 'status';

  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
}
