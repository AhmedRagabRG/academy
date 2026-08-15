import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsUUID,
} from 'class-validator';
import { ExpectedVersionDto } from '../../types/organization.dto';

export class UpdateGeneralSettingsDto extends ExpectedVersionDto {
  @IsIn(['ar', 'en']) defaultLanguage!: string;
  @IsIn(['Africa/Cairo', 'Asia/Riyadh']) timeZone!: string;
  @IsIn(['EGP', 'SAR', 'USD']) currency!: string;
  @IsIn(['dd/MM/yyyy', 'yyyy-MM-dd']) dateFormat!: string;
  @IsIn(['ar-EG', 'en-US']) numberFormat!: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], { each: true })
  workingDays!: string[];
  @IsUUID() defaultBranchId!: string;
  @IsUUID() defaultAcademicYearId!: string;
}
export class GeneralSettingsResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  defaultLanguage!: string;
  timeZone!: string;
  currency!: string;
  dateFormat!: string;
  numberFormat!: string;
  workingDays!: string[];
  defaultBranchId!: string;
  defaultAcademicYearId!: string;
  version!: number;
}
