import { HttpStatus } from '@nestjs/common';

export class ErrorDto {
  success = false as const;
  error!: {
    code: string;
    message: string;
    statusCode: HttpStatus;
    timestamp: Date;
    path?: string;
    /**
     * Either a keyed map or the contract's array of field errors — subclasses
     * narrow it to whichever shape their code actually returns.
     */
    details?: Record<string, unknown> | unknown[];
  };
}

export class ValidationErrorDto extends ErrorDto {
  declare error: {
    code: 'VALIDATION_ERROR';
    message: string;
    statusCode: HttpStatus.BAD_REQUEST;
    timestamp: Date;
    details: {
      field: string;
      constraint: string;
      value: unknown;
    }[];
  };
}

export class ConflictErrorDto extends ErrorDto {
  declare error: {
    code: 'CONFLICT';
    message: string;
    statusCode: HttpStatus.CONFLICT;
    timestamp: Date;
    details?: {
      reason:
        'VERSION_MISMATCH' | 'INVALID_STATUS_TRANSITION' | 'ALREADY_SUBMITTED';
      currentVersion?: number;
      expectedVersion?: number;
      currentStatus?: string;
      requiredStatus?: string;
    };
  };
}

export class NotFoundErrorDto extends ErrorDto {
  declare error: {
    code: 'NOT_FOUND';
    message: string;
    statusCode: HttpStatus.NOT_FOUND;
    timestamp: Date;
  };
}

export class UnauthorizedErrorDto extends ErrorDto {
  declare error: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN';
    message: string;
    statusCode: HttpStatus.UNAUTHORIZED | HttpStatus.FORBIDDEN;
    timestamp: Date;
    details?: {
      requiredPermission?: string;
      userPermissions?: string[];
    };
  };
}
