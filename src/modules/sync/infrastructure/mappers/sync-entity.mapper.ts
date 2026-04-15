import { UserDictionaryCard, UserSetting } from '@prisma/client';
import {
  DictionaryCardSyncEntity,
  SettingSyncEntity,
} from '../../application/types/sync-contracts.type';

export function mapDictionaryCardEntity(
  card: Pick<
    UserDictionaryCard,
    'id' | 'card' | 'updatedAt' | 'deletedAt' | 'serverRevision'
  >,
): DictionaryCardSyncEntity {
  return {
    id: card.id,
    card: card.card,
    updatedAt: card.updatedAt.toISOString(),
    deletedAt: card.deletedAt ? card.deletedAt.toISOString() : null,
    serverRevision: Number(card.serverRevision),
  };
}

export function mapSettingEntity(
  setting: Pick<
    UserSetting,
    'settingKey' | 'value' | 'updatedAt' | 'deletedAt' | 'serverRevision'
  >,
): SettingSyncEntity {
  return {
    key: setting.settingKey as SettingSyncEntity['key'],
    value: setting.value ?? null,
    updatedAt: setting.updatedAt.toISOString(),
    deletedAt: setting.deletedAt ? setting.deletedAt.toISOString() : null,
    serverRevision: Number(setting.serverRevision),
  };
}
