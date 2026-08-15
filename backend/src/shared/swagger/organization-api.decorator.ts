import { applyDecorators, type Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from './api-envelope.decorator';

export const ApiOrganizationRead = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiEnvelopeResponse(model),
    ApiErrorResponses('FORBIDDEN', 'NOT_FOUND', 'out-of-scope', 'SERVER_ERROR'),
  );

export const ApiOrganizationList = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiPaginatedResponse(model),
    ApiErrorResponses('VALIDATION_ERROR', 'FORBIDDEN', 'SERVER_ERROR'),
  );

export const ApiOrganizationCreate = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiCreatedResponse({ type: model }),
    ApiErrorResponses(
      'VALIDATION_ERROR',
      'DUPLICATE_VALUE',
      'FORBIDDEN',
      'SERVER_ERROR',
    ),
  );

export const ApiOrganizationMutation = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiEnvelopeResponse(model),
    ApiErrorResponses(
      'VALIDATION_ERROR',
      'DUPLICATE_VALUE',
      'ENTITY_IN_USE',
      'INVALID_STATE',
      'DATE_OVERLAP',
      'VERSION_CONFLICT',
      'FORBIDDEN',
      'NOT_FOUND',
      'SERVER_ERROR',
    ),
  );
