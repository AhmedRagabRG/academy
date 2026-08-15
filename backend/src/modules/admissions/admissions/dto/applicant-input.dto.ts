import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ApplicantInputDto {
  @ApiProperty({ example: 'محمد أحمد علي' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '01012345678' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  primaryPhone!: string;

  @ApiPropertyOptional({ example: '01098765432' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  guardianPhone?: string;

  @ApiPropertyOptional({ example: '29801011234567' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nationalId?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @ValidateIf((value: ApplicantInputDto) => !value.nationalId)
  @IsString()
  @MinLength(3)
  @MaxLength(250)
  alternativeIdentityReason?: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  address!: string;

  @ApiProperty({ example: '1998-01-01' })
  @IsDateString({ strict: true })
  dateOfBirth!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qualificationId!: string;

  @ApiProperty({ example: 2020 })
  @IsInt()
  @Min(1900)
  @Max(9999)
  graduationYear!: number;

  @ApiPropertyOptional({ default: '' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
