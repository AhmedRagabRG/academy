import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const TICKET_STATUSES = [
  'backlog',
  'todo',
  'in-progress',
  'waiting',
  'review',
  'done',
] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const array = ({ value }: { value: unknown }) => {
  if (value === undefined) return undefined;
  const values: unknown[] = Array.isArray(value)
    ? (value as unknown[])
    : [value];
  return values.flatMap((item) =>
    typeof item === 'string' ? item.split(',').filter(Boolean) : [item],
  );
};

export class TicketListDto {
  @IsOptional() @IsIn(['active', 'archived']) mode: 'active' | 'archived' =
    'active';
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsIn([...TICKET_STATUSES, 'archived'], { each: true })
  status?: string[];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsIn(TICKET_PRIORITIES, { each: true })
  priority?: string[];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  teamId?: string[];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  employeeId?: string[];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsString({ each: true })
  tag?: string[];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  createdBy?: string[];
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional()
  @IsIn(['newest', 'oldest', 'priority', 'updated'])
  sort: string = 'updated';
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class CreateTicketDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(3) @MaxLength(10000) description!: string;
  @IsIn(TICKET_STATUSES) status!: string;
  @IsIn(TICKET_PRIORITIES) priority!: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsArray() @IsString({ each: true }) tags!: string[];
}

export class UpdateTicketDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  description?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
export class VersionDto {
  @IsInt() @Min(1) expectedVersion!: number;
}
export class StatusDto extends VersionDto {
  @IsIn(TICKET_STATUSES) status!: string;
}
export class PriorityDto extends VersionDto {
  @IsIn(TICKET_PRIORITIES) priority!: string;
}
export class AssignmentDto extends VersionDto {
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
}
export class CommentDto {
  @IsString() @MinLength(1) @MaxLength(4000) message!: string;
}
export class PageDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}
