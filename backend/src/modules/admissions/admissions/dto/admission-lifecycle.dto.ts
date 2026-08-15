import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ChangeAdmissionStatusDto {
  @IsIn([
    'submitted',
    'under-review',
    'approved',
    'rejected',
    'draft',
    'archived',
  ])
  toStatus!:
    | 'submitted'
    | 'under-review'
    | 'approved'
    | 'rejected'
    | 'draft'
    | 'archived';

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((value: ChangeAdmissionStatusDto) =>
    ['rejected', 'draft', 'archived'].includes(value.toStatus),
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;

  @IsInt() @Min(1) expectedVersion!: number;
}

export class BulkAdmissionStatusItemDto extends ChangeAdmissionStatusDto {
  @IsUUID() admissionId!: string;
}

export class BulkAdmissionStatusDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkAdmissionStatusItemDto)
  items!: BulkAdmissionStatusItemDto[];
}

export class AdmissionReadinessQueryDto {
  @IsIn(['submit', 'approve']) action!: 'submit' | 'approve';
}
