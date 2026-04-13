import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const AUTH_STORAGE_NOT_INITIALIZED_MESSAGE =
  'auth storage is not initialized. Run Prisma migrations and try again';

export function rethrowAuthPersistenceError(error: unknown): never {
  if (isMissingUsersTableError(error)) {
    throw new ServiceUnavailableException(AUTH_STORAGE_NOT_INITIALIZED_MESSAGE);
  }

  throw error;
}

function isMissingUsersTableError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    error.meta?.modelName === 'User'
  );
}
