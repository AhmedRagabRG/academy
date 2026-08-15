import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageQueryDto } from '../../../../shared/pagination/page-query.dto';

export class ListProgramBatchesDto extends PageQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsUUID() intakeId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.toUpperCase().replaceAll('-', '_')
      : value,
  )
  @IsIn([
    'DRAFT',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'STUDYING',
    'GRADUATED',
    'ARCHIVED',
    'ALL',
  ])
  status?:
    | 'DRAFT'
    | 'REGISTRATION_OPEN'
    | 'REGISTRATION_CLOSED'
    | 'STUDYING'
    | 'GRADUATED'
    | 'ARCHIVED'
    | 'ALL';
  @IsOptional() @IsIn(['updatedAt', 'name', 'code', 'status']) sortBy?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
}
