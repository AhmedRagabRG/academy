import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Mirrors the palette the inbox badge already renders. */
export const TAG_COLORS = [
  'blue',
  'amber',
  'red',
  'green',
  'violet',
  'slate',
] as const;

export class CreateTagDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) label!: string;
  @IsIn(TAG_COLORS) color!: (typeof TAG_COLORS)[number];
}

export class UpdateTagDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label?: string;

  @IsOptional() @IsIn(TAG_COLORS) color?: (typeof TAG_COLORS)[number];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class TagResponseDto {
  id!: string;
  label!: string;
  color!: string;
  active!: boolean;
  usageCount!: number;
}
