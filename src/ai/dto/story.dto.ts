export class StorySettingsDto {
  educationLanguage!: string;
  chunkLength!: number;
  storyLanguageDifficulty!: number;
  prompt?: string;
  character!: string;
  genres!: string[];
  setting!: string;
  plotMotif!: string;
  narrativeStyle!: string;
  tone!: string;
}

export class DictionaryCardDto {
  id!: string;
  text!: string;
}

export class StoryActionsDto {
  action1!: string;
  action2!: string;
}

export class StoryChunkDto {
  text!: string;
  actions!: StoryActionsDto;
}

export class StoryChunkVariantsDto {
  chunk1!: StoryChunkDto;
  chunk2!: StoryChunkDto;
}

export class InitStoryRequestDto {
  settings!: StorySettingsDto;
  cards!: DictionaryCardDto[];
}

export class ContinueStoryRequestDto {
  story!: string;
  actions!: StoryActionsDto;
  settings!: StorySettingsDto;
  cards!: DictionaryCardDto[];
}
