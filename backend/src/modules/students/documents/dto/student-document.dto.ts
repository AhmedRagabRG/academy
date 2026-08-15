import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class StudentDocumentRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}

export class StudentDocumentItemRouteDto extends StudentDocumentRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  documentId!: string;
}

export class UploadStudentDocumentDto {
  @ApiProperty({
    description:
      'One of the published document type keys from /students/lookups',
    example: 'national-id',
  })
  @IsString()
  typeKey!: string;

  @ApiProperty({
    description:
      'Client-generated. Repeating a value resolves to the stored version instead of creating a duplicate.',
  })
  @IsString()
  @Length(1, 200)
  uploadAttemptId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ReplaceStudentDocumentDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  uploadAttemptId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ArchiveStudentDocumentDto {
  @ApiPropertyOptional({ maxLength: 250 })
  @IsOptional()
  @IsString()
  @Length(1, 250)
  reason?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
