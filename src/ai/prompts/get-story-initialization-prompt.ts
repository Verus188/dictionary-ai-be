import { DictionaryCardDto, StorySettingsDto } from '../dto/story.dto';

export const getStoryInitializationPrompt = (
  systemPrompt: string,
  settings: StorySettingsDto,
  dictionaryCards: DictionaryCardDto[],
) => {
  const languagePrompt = `The story must be written in ${settings.educationLanguage}.`;
  const continuationSizePrompt = `The story length should be about ${settings.chunkLength} characters.`;

  const languageDifficultyPrompt = `Use the language complexity level = ${settings.storyLanguageDifficulty}, where 1 is the simplest and 6 is the most complex.
    1.	Very simple language — short sentences, basic words, minimal descriptions (suitable for children).
    2.	Simple language — slightly longer sentences, easy vocabulary, simple imagery.
    3.	Intermediate level — everyday conversational style, clear language, a moderate amount of detail.
    4.	Advanced level — more complex sentences, diverse vocabulary, metaphors and descriptions.
    5.	Complex level — rich literary language, rare words, long sentences, sophisticated structures.
    6.	Very complex language — almost academic style, high density of metaphors and literary devices, abundance of details.`;

  const dictionaryCardsPrompt = dictionaryCards.length
    ? `Use the following dictionary cards naturally in the story when possible: ${dictionaryCards
        .map((card) => card.text)
        .join(', ')}.
If any card is not written in ${settings.educationLanguage}, adapt it into ${settings.educationLanguage} before using it in the story.`
    : '';

  const tags = [
    settings.character?.trim()
      ? `Character: ${settings.character.trim()}.`
      : '',
    settings.genres.length ? `Genres: ${settings.genres.join(', ')}.` : '',
    `Setting: ${settings.setting}.`,
    settings.plotMotif?.trim()
      ? `Plot Motif: ${settings.plotMotif.trim()}.`
      : '',
    settings.narrativeStyle?.trim()
      ? `Narrative Style: ${settings.narrativeStyle.trim()}.`
      : '',
    settings.tone?.trim() ? `Tone: ${settings.tone.trim()}.` : '',
  ].filter(Boolean);

  const tagsPrompt = tags.length
    ? ['The story should include the following elements:', ...tags].join('\n')
    : '';

  const storyPromptFinal = settings.prompt?.trim()
    ? `Also follow this additional user prompt: ${settings.prompt.trim()}`
    : '';

  return [
    systemPrompt,
    continuationSizePrompt,
    languagePrompt,
    languageDifficultyPrompt,
    dictionaryCardsPrompt,
    tagsPrompt,
    storyPromptFinal,
  ].join('\n');
};
