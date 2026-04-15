export const syncSettingKeys = [
  'storyContinuationLength',
  'educationLanguage',
  'storyLanguageDifficulty',
] as const;

export type SyncSettingKey = (typeof syncSettingKeys)[number];
