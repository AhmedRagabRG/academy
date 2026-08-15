import { applyDecorators, type Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from './api-envelope.decorator';

const admissionErrors = () =>
  ApiErrorResponses(
    'VALIDATION_ERROR',
    'BATCH_RULE_VIOLATED',
    'VERSION_CONFLICT',
    'INVALID_TRANSITION',
    'NOT_READY',
    'ELIGIBILITY_FAILED',
    'DUPLICATE_APPLICANT',
    'ALREADY_UNDER_REVIEW',
    'FORBIDDEN',
    'OUT_OF_SCOPE',
    'NOT_FOUND',
    'DEPENDENCY_NOT_FOUND',
    'SERVICE_UNAVAILABLE',
  );

export const ApiAdmissionRead = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiEnvelopeResponse(model),
    admissionErrors(),
  );

export const ApiAdmissionList = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiPaginatedResponse(model),
    admissionErrors(),
  );

export const ApiAdmissionCreate = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiCreatedResponse({ type: model }),
    admissionErrors(),
  );

export const ApiAdmissionMutation = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiEnvelopeResponse(model),
    admissionErrors(),
  );

export const ApiAdmissionCsv = (summary: string) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: 200,
      description: 'UTF-8 CSV with BOM',
      content: { 'text/csv': { schema: { type: 'string' } } },
    }),
    admissionErrors(),
  );
