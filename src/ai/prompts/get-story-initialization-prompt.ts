import { DictionaryCardInfo } from '../model/types';

export const getStoryInitializationPrompt = (
  systemPrompt: string,
  continuationSize: string,
  language: string,
  languageDifficulty: string,
  dictionaryCards: DictionaryCardInfo[],
  storyPrompt: string,
  character: string,
  genres: string[],
  setting: string,
  plotMotif: string,
  narrativeStyle: string,
  tone: string,
) => {
  const languagePrompt = 'The story have to be in ' + language;
  const continuationSizePrompt = `The length of the story should be about ${continuationSize} characters.`;

  const languageDifficultyPrompt = `Use the language complexity level = ${languageDifficulty}, where 1 is the simplest and 6 is the most complex.
    1.	Very simple language — short sentences, basic words, minimal descriptions (suitable for children).
    2.	Simple language — slightly longer sentences, easy vocabulary, simple imagery.
    3.	Intermediate level — everyday conversational style, clear language, a moderate amount of detail.
    4.	Advanced level — more complex sentences, diverse vocabulary, metaphors and descriptions.
    5.	Complex level — rich literary language, rare words, long sentences, sophisticated structures.
    6.	Very complex language — almost academic style, high density of metaphors and literary devices, abundance of details.`;

  const dictionaryCardsPrompt = dictionaryCards
    ? `Use the following words and phrases in story if possible: ${dictionaryCards
        .map((card) => card.card)
        .join(', ')}`
    : '';

  const tagsPrompt = `The story should include the following elements:
    Character: ${character}.
    Genres: ${genres.join(', ')}.
    Setting: ${setting}.
    Plot Motif: ${plotMotif}.
    Narrative Style: ${narrativeStyle}.
    Tone: ${tone}.`;

  const storyPromptFinal =
    storyPrompt !== ''
      ? `Also use the following story prompt to create the story: ${storyPrompt}`
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
