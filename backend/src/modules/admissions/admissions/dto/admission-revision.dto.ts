import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  AdmissionFinancialInputDto,
  AdmissionSelectionInputDto,
} from './create-admission.dto';

export class ChangeAdmissionSelectionDto {
  @ValidateNested()
  @Type(() => AdmissionSelectionInputDto)
  selection!: AdmissionSelectionInputDto;
  @IsArray()
  @IsIn(['financial-recalculated', 'documents-repolicied'], { each: true })
  confirmedConsequences!: ('financial-recalculated' | 'documents-repolicied')[];
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class UpdateAdmissionFinancialsDto {
  @ValidateNested()
  @Type(() => AdmissionFinancialInputDto)
  input!: AdmissionFinancialInputDto;
  @IsInt() @Min(1) expectedVersion!: number;
}
