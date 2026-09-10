import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * The category is the machine key the model must choose from in the
 * create_ticket tool; the label is what admins and the model-facing prompt
 * read. Routing never assigns an employee — teamId is the only destination.
 */
export class CreateAiRoutingRuleDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'category must be a lowercase machine key like general-question',
  })
  category!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  categoryLabel!: string;

  /** null or omitted = unassigned (the backlog is where declined routing goes). */
  @IsOptional() @IsUUID('4') teamId?: string | null;

  @IsOptional() @IsIn(['low', 'medium', 'high', 'critical']) priority?: string;

  @IsOptional() @IsBoolean() active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  displayOrder?: number;
}

export class UpdateAiRoutingRuleDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  categoryLabel?: string;

  @IsOptional() @IsUUID('4') teamId?: string | null;

  @IsOptional() @IsIn(['low', 'medium', 'high', 'critical']) priority?: string;

  @IsOptional() @IsBoolean() active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  displayOrder?: number;
}

export class AiRoutingRuleResponseDto {
  id!: string;
  agentId!: string;
  category!: string;
  categoryLabel!: string;
  teamId!: string | null;
  teamName!: string | null;
  priority!: string;
  active!: boolean;
  displayOrder!: number;
}
