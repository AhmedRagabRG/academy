import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTeamDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional() @IsBoolean() active?: boolean;
}

export class TeamResponseDto {
  id!: string;
  name!: string;
  active!: boolean;
  memberCount!: number;
  members!: Array<{ employeeId: string; displayName: string; active: boolean }>;
  createdAt!: string;
}
