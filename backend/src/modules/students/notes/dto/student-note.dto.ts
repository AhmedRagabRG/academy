import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export const NOTE_CONTENT_MAX = 2000;

export class StudentNoteRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}

export class StudentNoteItemRouteDto extends StudentNoteRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  noteId!: string;
}

/**
 * Note commands deliberately carry no `expectedVersion` — they do not bump the
 * student's version (FR-048).
 */
export class WriteStudentNoteDto {
  @ApiProperty({ maxLength: NOTE_CONTENT_MAX })
  @IsString()
  @Length(1, NOTE_CONTENT_MAX)
  content!: string;
}
