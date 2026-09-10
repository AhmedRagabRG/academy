import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateKnowledgeBaseDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateKnowledgeBaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class KnowledgeBaseVersionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class CreateKnowledgeSourceDto {
  @IsOptional()
  @IsIn(['file', 'text'])
  kind?: 'file' | 'text';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5_000_000)
  rawText?: string;

  @IsOptional()
  @IsIn(['customer-facing', 'internal'])
  visibility?: 'customer-facing' | 'internal';
}

export class KnowledgeBaseResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  description!: string | null;
  status!: string;
  version!: number;
  sourceCount?: number;
  createdAt!: string;
  updatedAt!: string;
}

export class KnowledgeSourceResponseDto {
  id!: string;
  knowledgeBaseId!: string;
  kind!: string;
  title!: string;
  visibility!: string;
  status!: string;
  failureReason!: string | null;
  activeRevision!: number;
  chunkCount!: number;
  tokenCount!: number;
  mimeType!: string | null;
  sizeBytes!: number | null;
  version!: number;
  createdAt!: string;
  updatedAt!: string;
}
