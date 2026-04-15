import { BadRequestException, Injectable } from '@nestjs/common';
import { PushSyncDto } from '../../presentation/dto/push-sync.dto';
import {
  PushSyncResponse,
  SyncEntityType,
} from '../types/sync-contracts.type';
import {
  ParsedSyncOperation,
  RawSyncOperation,
} from '../types/parsed-sync-operation.type';
import { SyncPushRepository } from '../../infrastructure/repositories/sync-push.repository';
import { SyncSettingKey, syncSettingKeys } from '../types/sync-setting-key.type';

@Injectable()
export class PushSyncUseCase {
  constructor(private readonly syncPushRepository: SyncPushRepository) {}

  execute(userId: string, request: PushSyncDto): Promise<PushSyncResponse> {
    const operations = request.operations.map((operation) =>
      this.parseOperation(operation),
    );

    return this.syncPushRepository.push(userId, request.deviceId, operations);
  }

  private parseOperation(operation: RawSyncOperation): ParsedSyncOperation {
    if (operation.entityType === 'dictionaryCard') {
      return this.parseDictionaryCardOperation({
        ...operation,
        entityType: 'dictionaryCard',
      });
    }

    return this.parseSettingOperation({
      ...operation,
      entityType: 'setting',
    });
  }

  private parseDictionaryCardOperation(
    operation: RawSyncOperation & { entityType: 'dictionaryCard' },
  ): ParsedSyncOperation {
    if (operation.operationType === 'delete') {
      this.assertNullPayload(operation.payload, operation.entityType);

      return {
        operationId: operation.operationId,
        entityType: 'dictionaryCard',
        operationType: 'delete',
        entityId: operation.entityId,
        clientUpdatedAt: operation.clientUpdatedAt,
        payload: null,
      };
    }

    const payload = this.assertObjectPayload(operation.payload, operation);
    const id = this.assertStringField(payload.id, 'payload.id');
    const normalizedCard = normalizeDictionaryCard(
      this.assertStringField(payload.card, 'payload.card'),
    );

    if (id !== operation.entityId) {
      throw new BadRequestException(
        'payload.id must match entityId for dictionary card sync',
      );
    }

    return {
      operationId: operation.operationId,
      entityType: 'dictionaryCard',
      operationType: 'upsert',
      entityId: operation.entityId,
      clientUpdatedAt: operation.clientUpdatedAt,
      payload: {
        id,
        card: normalizedCard,
        normalizedCard,
      },
    };
  }

  private parseSettingOperation(
    operation: RawSyncOperation & { entityType: 'setting' },
  ): ParsedSyncOperation {
    const key = this.parseSettingKey(operation.entityId, 'entityId');

    if (operation.operationType === 'delete') {
      this.assertNullPayload(operation.payload, operation.entityType);

      return {
        operationId: operation.operationId,
        entityType: 'setting',
        operationType: 'delete',
        entityId: key,
        clientUpdatedAt: operation.clientUpdatedAt,
        payload: null,
      };
    }

    const payload = this.assertObjectPayload(operation.payload, operation);
    const payloadKey = this.parseSettingKey(payload.key, 'payload.key');

    if (payloadKey !== key) {
      throw new BadRequestException(
        'payload.key must match entityId for setting sync',
      );
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'value')) {
      throw new BadRequestException('payload.value is required for setting sync');
    }

    return {
      operationId: operation.operationId,
      entityType: 'setting',
      operationType: 'upsert',
      entityId: key,
      clientUpdatedAt: operation.clientUpdatedAt,
      payload: {
        key,
        value: payload.value ?? null,
      },
    };
  }

  private assertNullPayload(payload: unknown, entityType: SyncEntityType) {
    if (payload !== null) {
      throw new BadRequestException(
        `payload must be null for ${entityType} delete operations`,
      );
    }
  }

  private assertObjectPayload(
    payload: unknown,
    operation: RawSyncOperation,
  ): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException(
        `payload must be an object for ${operation.entityType} ${operation.operationType} operations`,
      );
    }

    return payload as Record<string, unknown>;
  }

  private assertStringField(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string`);
    }

    return value.trim();
  }

  private parseSettingKey(value: unknown, fieldName: string): SyncSettingKey {
    if (
      typeof value !== 'string' ||
      !syncSettingKeys.includes(value as SyncSettingKey)
    ) {
      throw new BadRequestException(`${fieldName} is not a supported setting key`);
    }

    return value as SyncSettingKey;
  }
}

function normalizeDictionaryCard(card: string) {
  const normalized = card.trim().replace(/\s+/g, ' ').toLowerCase();

  if (!normalized.length) {
    throw new BadRequestException('payload.card must not be empty');
  }

  return normalized;
}
