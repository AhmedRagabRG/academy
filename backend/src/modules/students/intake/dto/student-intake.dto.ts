import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

/**
 * The intake command. Everything else about the student is resolved from the
 * admission's immutable approval snapshot through ADMISSIONS_ENROLLMENT_PORT —
 * the client cannot inject identity, pricing or academic values here.
 */
export class StudentIntakeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  admissionId!: string;

  @ApiProperty({
    description:
      'The admission version the caller read. A mismatch refuses with admission-version-stale.',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  admissionVersion!: number;
}
