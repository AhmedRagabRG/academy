import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ChangeBatchStatusDto {
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
  ])
  toStatus!:
    | 'DRAFT'
    | 'REGISTRATION_OPEN'
    | 'REGISTRATION_CLOSED'
    | 'STUDYING'
    | 'GRADUATED'
    | 'ARCHIVED';
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsInt() @Min(1) expectedVersion!: number;
}
