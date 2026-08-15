import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, ValidateNested } from 'class-validator';
import { AdmissionInputDto } from './create-admission.dto';

export class UpdateAdmissionDto {
  @ValidateNested() @Type(() => AdmissionInputDto) input!: AdmissionInputDto;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedVersion!: number;
}
