import { SyncAppliedResultKind } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { SyncPushRepository } from './sync-push.repository';
import { ParsedSyncOperation } from '../../application/types/parsed-sync-operation.type';

describe('SyncPushRepository', () => {
  let prismaService: jest.Mocked<PrismaService>;
  let repository: SyncPushRepository;

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    repository = new SyncPushRepository(prismaService);
  });

  it('returns a duplicate merge conflict for the same normalized dictionary card', async () => {
    const tx = createTransactionMock({
      syncAppliedOperation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      userDictionaryCard: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'card-1',
            userId: 'user-1',
            card: 'betrayal',
            normalizedCard: 'betrayal',
            createdAt: new Date('2026-04-13T10:00:00.000Z'),
            updatedAt: new Date('2026-04-13T10:08:00.000Z'),
            deletedAt: null,
            serverRevision: 104n,
          }),
      },
    });

    prismaService.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );

    await expect(
      repository.push('user-1', 'device-a', [createDictionaryUpsertOperation()]),
    ).resolves.toEqual({
      results: [],
      conflicts: [
        {
          operationId: 'op-1',
          type: 'dictionary_duplicate_merged',
          entityType: 'dictionaryCard',
          submittedEntityId: 'card-2',
          canonicalEntity: {
            id: 'card-1',
            card: 'betrayal',
            updatedAt: '2026-04-13T10:08:00.000Z',
            deletedAt: null,
            serverRevision: 104,
          },
        },
      ],
    });

    expect(tx.syncAppliedOperation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        deviceId: 'device-a',
        operationId: 'op-1',
        resultKind: SyncAppliedResultKind.conflict,
      }),
    });
    expect(tx.syncChangeLog.create).not.toHaveBeenCalled();
  });

  it('treats delete for an already deleted card as a noop success', async () => {
    const tx = createTransactionMock({
      syncAppliedOperation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      userDictionaryCard: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-1',
          userId: 'user-1',
          card: 'betrayal',
          normalizedCard: 'betrayal',
          createdAt: new Date('2026-04-13T10:00:00.000Z'),
          updatedAt: new Date('2026-04-13T10:09:00.000Z'),
          deletedAt: new Date('2026-04-13T10:09:00.000Z'),
          serverRevision: 105n,
        }),
      },
    });

    prismaService.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );

    await expect(
      repository.push('user-1', 'device-a', [createDictionaryDeleteOperation()]),
    ).resolves.toEqual({
      results: [
        {
          operationId: 'op-2',
          status: 'noop',
          entityType: 'dictionaryCard',
          entityId: 'card-1',
          serverRevision: 105,
        },
      ],
      conflicts: [],
    });

    expect(tx.userDictionaryCard.update).not.toHaveBeenCalled();
    expect(tx.syncChangeLog.create).not.toHaveBeenCalled();
  });

  it('reuses the stored applied result for idempotent retries', async () => {
    const tx = createTransactionMock({
      syncAppliedOperation: {
        findUnique: jest.fn().mockResolvedValue({
          resultKind: SyncAppliedResultKind.result,
          resultPayload: {
            operationId: 'op-1',
            status: 'applied',
            entityType: 'dictionaryCard',
            entityId: 'card-2',
            serverRevision: 101,
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );

    await expect(
      repository.push('user-1', 'device-a', [createDictionaryUpsertOperation()]),
    ).resolves.toEqual({
      results: [
        {
          operationId: 'op-1',
          status: 'applied',
          entityType: 'dictionaryCard',
          entityId: 'card-2',
          serverRevision: 101,
        },
      ],
      conflicts: [],
    });

    expect(tx.syncAppliedOperation.create).not.toHaveBeenCalled();
    expect(tx.userDictionaryCard.findFirst).not.toHaveBeenCalled();
  });

  it('converges duplicate card creates from two devices to one canonical card', async () => {
    const firstTransaction = createTransactionMock({
      syncAppliedOperation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      userDictionaryCard: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({
          id: 'card-1',
          userId: 'user-1',
          card: 'betrayal',
          normalizedCard: 'betrayal',
          createdAt: new Date('2026-04-13T10:00:00.000Z'),
          updatedAt: new Date('2026-04-13T10:00:00.000Z'),
          deletedAt: null,
          serverRevision: 101n,
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ revision: 101n }]),
    });

    const secondTransaction = createTransactionMock({
      syncAppliedOperation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      userDictionaryCard: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'card-1',
            userId: 'user-1',
            card: 'betrayal',
            normalizedCard: 'betrayal',
            createdAt: new Date('2026-04-13T10:00:00.000Z'),
            updatedAt: new Date('2026-04-13T10:00:00.000Z'),
            deletedAt: null,
            serverRevision: 101n,
          }),
      },
    });

    prismaService.$transaction
      .mockImplementationOnce(async (callback) => callback(firstTransaction))
      .mockImplementationOnce(async (callback) => callback(secondTransaction));

    await expect(
      repository.push('user-1', 'device-a', [
        createDictionaryUpsertOperation({
          operationId: 'op-1',
          entityId: 'card-1',
          payloadId: 'card-1',
        }),
      ]),
    ).resolves.toEqual({
      results: [
        {
          operationId: 'op-1',
          status: 'applied',
          entityType: 'dictionaryCard',
          entityId: 'card-1',
          serverRevision: 101,
        },
      ],
      conflicts: [],
    });

    await expect(
      repository.push('user-1', 'device-b', [
        createDictionaryUpsertOperation({
          operationId: 'op-2',
          entityId: 'card-2',
          payloadId: 'card-2',
        }),
      ]),
    ).resolves.toEqual({
      results: [],
      conflicts: [
        {
          operationId: 'op-2',
          type: 'dictionary_duplicate_merged',
          entityType: 'dictionaryCard',
          submittedEntityId: 'card-2',
          canonicalEntity: {
            id: 'card-1',
            card: 'betrayal',
            updatedAt: '2026-04-13T10:00:00.000Z',
            deletedAt: null,
            serverRevision: 101,
          },
        },
      ],
    });
  });
});

function createDictionaryUpsertOperation(
  overrides: {
    operationId?: string;
    entityId?: string;
    payloadId?: string;
  } = {},
): ParsedSyncOperation {
  return {
    operationId: overrides.operationId ?? 'op-1',
    entityType: 'dictionaryCard',
    operationType: 'upsert',
    entityId: overrides.entityId ?? 'card-2',
    clientUpdatedAt: '2026-04-13T10:00:00.000Z',
    payload: {
      id: overrides.payloadId ?? overrides.entityId ?? 'card-2',
      card: 'betrayal',
      normalizedCard: 'betrayal',
    },
  };
}

function createDictionaryDeleteOperation(): ParsedSyncOperation {
  return {
    operationId: 'op-2',
    entityType: 'dictionaryCard',
    operationType: 'delete',
    entityId: 'card-1',
    clientUpdatedAt: '2026-04-13T10:05:00.000Z',
    payload: null,
  };
}

function createTransactionMock(overrides: Record<string, unknown>) {
  const {
    syncAppliedOperation,
    userDictionaryCard,
    userSetting,
    syncChangeLog,
    ...rest
  } = overrides;

  return {
    syncAppliedOperation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      ...(syncAppliedOperation as Record<string, unknown>),
    },
    userDictionaryCard: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      ...(userDictionaryCard as Record<string, unknown>),
    },
    userSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      ...(userSetting as Record<string, unknown>),
    },
    syncChangeLog: {
      create: jest.fn(),
      ...(syncChangeLog as Record<string, unknown>),
    },
    $queryRaw: jest.fn(),
    ...rest,
  };
}
