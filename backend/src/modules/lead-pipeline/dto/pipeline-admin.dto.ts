import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const PIPELINE_STAGE_OUTCOMES = ['open', 'won', 'lost'] as const;
export const PIPELINE_STAGE_ACCENTS = [
  'slate',
  'blue',
  'sky',
  'amber',
  'violet',
  'green',
  'red',
] as const;
export type PipelineStageAccent = (typeof PIPELINE_STAGE_ACCENTS)[number];
export type PipelineStageOutcomeCode = (typeof PIPELINE_STAGE_OUTCOMES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePipelineDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) code!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
}

export class UpdatePipelineDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class PipelineVersionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}

export class CreatePipelineStageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedPipelineVersion!: number;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) code!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(400) description = '';
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability = 0;
  @IsOptional()
  @IsIn(PIPELINE_STAGE_ACCENTS)
  accent: PipelineStageAccent = 'slate';
  @IsOptional()
  @IsIn(PIPELINE_STAGE_OUTCOMES)
  outcome: PipelineStageOutcomeCode = 'open';
  @IsOptional() @IsBoolean() isEntry = false;
}

export class UpdatePipelineStageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedPipelineVersion!: number;
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(400)
  description?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;
  @IsOptional() @IsIn(PIPELINE_STAGE_ACCENTS) accent?: PipelineStageAccent;
  @IsOptional()
  @IsIn(PIPELINE_STAGE_OUTCOMES)
  outcome?: PipelineStageOutcomeCode;
  @IsOptional() @IsBoolean() isEntry?: boolean;
}

export class PipelineStageVersionDto extends PipelineVersionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedPipelineVersion!: number;
}

export class ReorderStageItemDto {
  @IsUUID() id!: string;
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}

export class ReorderPipelineStagesDto {
  @Type(() => Number) @IsInt() @Min(1) expectedPipelineVersion!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStageItemDto)
  items!: ReorderStageItemDto[];
}
