import { StoryChunkDto } from '../dto/story.dto';

export const storyInitializationResponseExample: StoryChunkDto = {
  text: 'story chunk',
  actions: {
    action1: 'short action',
    action2: 'short action',
  },
};

export const isStoryInitializationResponse = (
  value: unknown,
): value is StoryChunkDto => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as StoryChunkDto;

  return (
    typeof candidate.text === 'string' &&
    !!candidate.text.trim() &&
    !!candidate.actions &&
    typeof candidate.actions.action1 === 'string' &&
    !!candidate.actions.action1.trim() &&
    typeof candidate.actions.action2 === 'string' &&
    !!candidate.actions.action2.trim()
  );
};

export const storyInitializationSystemPrompt = `
You are a storyteller. Write the opening chunk of an interactive story.

Return only valid JSON with this exact shape:
${JSON.stringify(storyInitializationResponseExample, null, 2)}

Rules:
- Do not wrap the JSON in markdown fences.
- The "text" field must contain the full opening story chunk.
- "action1" and "action2" must be two different plausible next actions for the main character.
- Each action must be concise, ideally no more than 5-6 words.
- Do not add any fields other than "text" and "actions".
`;
