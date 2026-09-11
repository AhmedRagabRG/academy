import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBranchDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'code must be a lowercase machine key like main-campus',
  })
  code!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(240) address?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @Transform(trim) @IsEmail() email?: string;
}

export class UpdateBranchDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(240) address?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @Transform(trim) @IsEmail() email?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class BranchResponseDto {
  id!: string;
  code!: string;
  name!: string;
  address!: string | null;
  phone!: string | null;
  email!: string | null;
  active!: boolean;
  contactCount!: number;
  ticketCount!: number;
  memberCount!: number;
  version!: number;
}
