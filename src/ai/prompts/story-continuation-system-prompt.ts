import { StoryChunkVariantsDto } from '../dto/story.dto';
import { isStoryInitializationResponse } from './story-initialization-system-prompt';

export const storyContinuationResponseExample: StoryChunkVariantsDto = {
  chunk1: {
    text: 'continuation for action1',
    actions: {
      action1: 'short action',
      action2: 'short action',
    },
  },
  chunk2: {
    text: 'continuation for action2',
    actions: {
      action1: 'short action',
      action2: 'short action',
    },
  },
};

export const isStoryContinuationResponse = (
  value: unknown,
): value is StoryChunkVariantsDto => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as StoryChunkVariantsDto;

  return (
    isStoryInitializationResponse(candidate.chunk1) &&
    isStoryInitializationResponse(candidate.chunk2)
  );
};

export const storyContinuationSystemPrompt = `
You are a storyteller. Continue the story in two different branches.

The input includes:
- the existing story
- action1, which must be reflected in chunk1
- action2, which must be reflected in chunk2

Return only valid JSON with this exact shape:
${JSON.stringify(storyContinuationResponseExample, null, 2)}

Rules:
- Do not wrap the JSON in markdown fences.
- chunk1.text must continue the story according to action1.
- chunk2.text must continue the story according to action2.
- Each chunk must propose two new plausible next actions.
- Each action must be concise, ideally no more than 5-6 words.
- Do not add any fields other than chunk1 and chunk2.
`;
