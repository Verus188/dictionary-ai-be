import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class StorySettingsDto {
  @IsString()
  @IsNotEmpty()
  educationLanguage!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  chunkLength!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  storyLanguageDifficulty!: number;

  @IsOptional()
  @IsString()
  prompt?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  character!: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  genres!: string[];

  @IsString()
  @IsNotEmpty()
  setting!: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  plotMotif!: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  narrativeStyle!: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  tone!: string | null;
}

export class DictionaryCardDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class StoryActionsDto {
  @IsString()
  @IsNotEmpty()
  action1!: string;

  @IsString()
  @IsNotEmpty()
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
  @IsDefined()
  @ValidateNested()
  @Type(() => StorySettingsDto)
  settings!: StorySettingsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DictionaryCardDto)
  cards!: DictionaryCardDto[];
}

export class ContinueStoryRequestDto {
  @IsString()
  @IsNotEmpty()
  story!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => StoryActionsDto)
  actions!: StoryActionsDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => StorySettingsDto)
  settings!: StorySettingsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DictionaryCardDto)
  cards!: DictionaryCardDto[];
}
