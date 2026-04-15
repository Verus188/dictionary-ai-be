import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SyncAppliedResultKind,
  SyncEntityType,
  SyncOperationType,
  UserSetting,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  ParsedDictionaryCardDeleteOperation,
  ParsedDictionaryCardUpsertOperation,
  ParsedSettingDeleteOperation,
  ParsedSettingUpsertOperation,
  ParsedSyncOperation,
} from '../../application/types/parsed-sync-operation.type';
import {
  PushSyncConflict,
  PushSyncResponse,
  PushSyncResult,
} from '../../application/types/sync-contracts.type';
import {
  mapDictionaryCardEntity,
  mapSettingEntity,
} from '../mappers/sync-entity.mapper';
import { rethrowSyncPersistenceError } from './rethrow-sync-persistence-error';

type SyncTransaction = Prisma.TransactionClient;

@Injectable()
export class SyncPushRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async push(
    userId: string,
    deviceId: string,
    operations: ParsedSyncOperation[],
  ): Promise<PushSyncResponse> {
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const results: PushSyncResult[] = [];
        const conflicts: PushSyncConflict[] = [];

        for (const operation of operations) {
          const appliedOperation = await tx.syncAppliedOperation.findUnique({
            where: {
              userId_deviceId_operationId: {
                userId,
                deviceId,
                operationId: operation.operationId,
              },
            },
          });

          if (appliedOperation) {
            this.appendStoredOutcome(appliedOperation, results, conflicts);
            continue;
          }

          const outcome =
            operation.entityType === 'dictionaryCard'
              ? await this.applyDictionaryCardOperation(tx, userId, operation)
              : await this.applySettingOperation(tx, userId, operation);

          await tx.syncAppliedOperation.create({
            data: {
              userId,
              deviceId,
              operationId: operation.operationId,
              entityType: operation.entityType,
              entityId: operation.entityId,
              resultKind: outcome.kind,
              resultPayload: outcome.payload as Prisma.InputJsonValue,
            },
          });

          if (outcome.kind === SyncAppliedResultKind.conflict) {
            conflicts.push(outcome.payload);
            continue;
          }

          results.push(outcome.payload);
        }

        return {
          results,
          conflicts,
        };
      });
    } catch (error) {
      rethrowSyncPersistenceError(error);
    }
  }

  private async applyDictionaryCardOperation(
    tx: SyncTransaction,
    userId: string,
    operation: ParsedDictionaryCardUpsertOperation | ParsedDictionaryCardDeleteOperation,
  ) {
    if (operation.operationType === 'delete') {
      return this.deleteDictionaryCard(tx, userId, operation);
    }

    return this.upsertDictionaryCard(tx, userId, operation);
  }

  private async applySettingOperation(
    tx: SyncTransaction,
    userId: string,
    operation: ParsedSettingUpsertOperation | ParsedSettingDeleteOperation,
  ) {
    if (operation.operationType === 'delete') {
      return this.deleteSetting(tx, userId, operation);
    }

    return this.upsertSetting(tx, userId, operation);
  }

  private async upsertDictionaryCard(
    tx: SyncTransaction,
    userId: string,
    operation: ParsedDictionaryCardUpsertOperation,
  ) {
    const existingById = await tx.userDictionaryCard.findFirst({
      where: {
        userId,
        id: operation.entityId,
      },
    });

    if (existingById?.deletedAt) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'ignored',
        entityType: 'dictionaryCard',
        entityId: operation.entityId,
        serverRevision: Number(existingById.serverRevision),
      });
    }

    const activeByNormalizedCard =
      await tx.userDictionaryCard.findFirst({
        where: {
          userId,
          normalizedCard: operation.payload.normalizedCard,
          deletedAt: null,
        },
      });

    if (!existingById && activeByNormalizedCard) {
      return conflictOutcome({
        operationId: operation.operationId,
        type: 'dictionary_duplicate_merged',
        entityType: 'dictionaryCard',
        submittedEntityId: operation.entityId,
        canonicalEntity: mapDictionaryCardEntity(activeByNormalizedCard),
      });
    }

    if (
      existingById &&
      existingById.normalizedCard === operation.payload.normalizedCard &&
      existingById.card === operation.payload.card
    ) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'noop',
        entityType: 'dictionaryCard',
        entityId: operation.entityId,
        serverRevision: Number(existingById.serverRevision),
      });
    }

    const revision = await this.nextRevision(tx);
    const now = new Date();

    try {
      const card = existingById
        ? await tx.userDictionaryCard.update({
            where: {
              id: existingById.id,
            },
            data: {
              card: operation.payload.card,
              normalizedCard: operation.payload.normalizedCard,
              updatedAt: now,
              serverRevision: revision,
              deletedAt: null,
            },
          })
        : await tx.userDictionaryCard.create({
            data: {
              id: operation.payload.id,
              userId,
              card: operation.payload.card,
              normalizedCard: operation.payload.normalizedCard,
              createdAt: now,
              updatedAt: now,
              serverRevision: revision,
            },
          });

      const entity = mapDictionaryCardEntity(card);

      await tx.syncChangeLog.create({
        data: {
          cursor: revision,
          userId,
          entityType: SyncEntityType.dictionaryCard,
          entityId: card.id,
          changeType: SyncOperationType.upsert,
          payload: entity as Prisma.InputJsonValue,
        },
      });

      return resultOutcome({
        operationId: operation.operationId,
        status: 'applied',
        entityType: 'dictionaryCard',
        entityId: card.id,
        serverRevision: entity.serverRevision,
      });
    } catch (error) {
      if (isCardDuplicateConstraintError(error)) {
        const canonicalCard = await tx.userDictionaryCard.findFirstOrThrow({
          where: {
            userId,
            normalizedCard: operation.payload.normalizedCard,
            deletedAt: null,
          },
        });

        return conflictOutcome({
          operationId: operation.operationId,
          type: 'dictionary_duplicate_merged',
          entityType: 'dictionaryCard',
          submittedEntityId: operation.entityId,
          canonicalEntity: mapDictionaryCardEntity(canonicalCard),
        });
      }

      throw error;
    }
  }

  private async deleteDictionaryCard(
    tx: SyncTransaction,
    userId: string,
    operation: ParsedDictionaryCardDeleteOperation,
  ) {
    const existing = await tx.userDictionaryCard.findFirst({
      where: {
        userId,
        id: operation.entityId,
      },
    });

    if (!existing) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'noop',
        entityType: 'dictionaryCard',
        entityId: operation.entityId,
      });
    }

    if (existing.deletedAt) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'noop',
        entityType: 'dictionaryCard',
        entityId: operation.entityId,
        serverRevision: Number(existing.serverRevision),
      });
    }

    const revision = await this.nextRevision(tx);
    const now = new Date();

    const deletedCard = await tx.userDictionaryCard.update({
      where: {
        id: existing.id,
      },
      data: {
        updatedAt: now,
        deletedAt: now,
        serverRevision: revision,
      },
    });

    const entity = mapDictionaryCardEntity(deletedCard);

    await tx.syncChangeLog.create({
      data: {
        cursor: revision,
        userId,
        entityType: SyncEntityType.dictionaryCard,
        entityId: deletedCard.id,
        changeType: SyncOperationType.delete,
        payload: entity as Prisma.InputJsonValue,
      },
    });

    return resultOutcome({
      operationId: operation.operationId,
      status: 'applied',
      entityType: 'dictionaryCard',
      entityId: deletedCard.id,
      serverRevision: entity.serverRevision,
    });
  }

  private async upsertSetting(
    tx: SyncTransaction,
    userId: string,
    operation: ParsedSettingUpsertOperation,
  ) {
    const existing = await tx.userSetting.findUnique({
      where: {
        userId_settingKey: {
          userId,
          settingKey: operation.payload.key,
        },
      },
    });

    if (
      existing &&
      existing.deletedAt === null &&
      areJsonValuesEqual(existing.value, operation.payload.value)
    ) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'noop',
        entityType: 'setting',
        entityId: operation.entityId,
        serverRevision: Number(existing.serverRevision),
      });
    }

    const revision = await this.nextRevision(tx);
    const now = new Date();

    const setting = await tx.userSetting.upsert({
      where: {
        userId_settingKey: {
          userId,
          settingKey: operation.payload.key,
        },
      },
      update: {
        value: toPrismaJson(operation.payload.value),
        updatedAt: now,
        deletedAt: null,
        serverRevision: revision,
      },
      create: {
        userId,
        settingKey: operation.payload.key,
        value: toPrismaJson(operation.payload.value),
        updatedAt: now,
        deletedAt: null,
        serverRevision: revision,
      },
    });

    const entity = mapSettingEntity(setting);

    await tx.syncChangeLog.create({
      data: {
        cursor: revision,
        userId,
        entityType: SyncEntityType.setting,
        entityId: operation.payload.key,
        changeType: SyncOperationType.upsert,
        payload: entity as Prisma.InputJsonValue,
      },
    });

    return resultOutcome({
      operationId: operation.operationId,
      status: 'applied',
      entityType: 'setting',
      entityId: operation.payload.key,
      serverRevision: entity.serverRevision,
    });
  }

  private async deleteSetting(
    tx: SyncTransaction,
    userId: string,
    operation: ParsedSettingDeleteOperation,
  ) {
    const existing = await tx.userSetting.findUnique({
      where: {
        userId_settingKey: {
          userId,
          settingKey: operation.entityId,
        },
      },
    });

    if (!existing) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'noop',
        entityType: 'setting',
        entityId: operation.entityId,
      });
    }

    if (existing.deletedAt) {
      return resultOutcome({
        operationId: operation.operationId,
        status: 'noop',
        entityType: 'setting',
        entityId: operation.entityId,
        serverRevision: Number(existing.serverRevision),
      });
    }

    const revision = await this.nextRevision(tx);
    const now = new Date();

    const setting = await tx.userSetting.update({
      where: {
        userId_settingKey: {
          userId,
          settingKey: operation.entityId,
        },
      },
      data: {
        value: Prisma.DbNull,
        updatedAt: now,
        deletedAt: now,
        serverRevision: revision,
      },
    });

    const entity = mapSettingEntity(setting);

    await tx.syncChangeLog.create({
      data: {
        cursor: revision,
        userId,
        entityType: SyncEntityType.setting,
        entityId: operation.entityId,
        changeType: SyncOperationType.delete,
        payload: entity as Prisma.InputJsonValue,
      },
    });

    return resultOutcome({
      operationId: operation.operationId,
      status: 'applied',
      entityType: 'setting',
      entityId: operation.entityId,
      serverRevision: entity.serverRevision,
    });
  }

  private async nextRevision(tx: SyncTransaction): Promise<bigint> {
    const rows = await tx.$queryRaw<Array<{ revision: bigint }>>`
      SELECT nextval('sync_revision_sequence')::bigint AS revision
    `;

    return rows[0].revision;
  }

  private appendStoredOutcome(
    appliedOperation: {
      resultKind: SyncAppliedResultKind;
      resultPayload: Prisma.JsonValue;
    },
    results: PushSyncResult[],
    conflicts: PushSyncConflict[],
  ) {
    if (appliedOperation.resultKind === SyncAppliedResultKind.conflict) {
      conflicts.push(appliedOperation.resultPayload as unknown as PushSyncConflict);
      return;
    }

    results.push(appliedOperation.resultPayload as unknown as PushSyncResult);
  }
}

function resultOutcome(payload: PushSyncResult) {
  return {
    kind: SyncAppliedResultKind.result,
    payload,
  } as const;
}

function conflictOutcome(payload: PushSyncConflict) {
  return {
    kind: SyncAppliedResultKind.conflict,
    payload,
  } as const;
}

function isCardDuplicateConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function areJsonValuesEqual(
  left: UserSetting['value'],
  right: unknown | null,
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function toPrismaJson(
  value: unknown | null,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue);
}
