import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import {
  DependencyInUseException,
  DependencyNotFoundException,
  DuplicateException,
} from '../core/exceptions';

@Injectable()
export class PrismaErrorMapper {
  map(error: unknown): never {
    const text =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new DuplicateException();
      if (error.code === 'P2003') throw new DependencyInUseException();
      if (error.code === 'P2025') throw new DependencyNotFoundException();
    }
    throw error;
  }
}
