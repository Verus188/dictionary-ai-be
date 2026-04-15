import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const SYNC_STORAGE_NOT_INITIALIZED_MESSAGE =
  'sync storage is not initialized. Run Prisma migrations and try again';

const syncModelNames = new Set([
  'UserDictionaryCard',
  'UserSetting',
  'SyncAppliedOperation',
  'SyncChangeLog',
]);

export function rethrowSyncPersistenceError(error: unknown): never {
  if (isMissingSyncStorageError(error)) {
    throw new ServiceUnavailableException(SYNC_STORAGE_NOT_INITIALIZED_MESSAGE);
  }

  throw error;
}

function isMissingSyncStorageError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    typeof error.meta?.modelName === 'string' &&
    syncModelNames.has(error.meta.modelName)
  );
}
