import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const motivationTool = createTool({
  id: 'generate-motivation',
  description: 'Generate a short motivational message tailored to the user prompt',
  inputSchema: z.object({
    prompt: z.string().describe('User prompt or situation to motivate'),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const prompt = String(context.prompt || '');
    return {
      message: generateMotivation(prompt),
    };
  },
});

function generateMotivation(prompt: string) {
  // Simple deterministic generation based on prompt — keeps the tool local and testable.
  const templates = [
    `You can do this. Start with one small step: ${extractAction(prompt)}.`,
    `Remember why you started. Break it down and take the first tiny step: ${extractAction(prompt)}.`,
    `You have what it takes. Focus on one thing you can do right now: ${extractAction(prompt)}.`,
  ];

  const idx = Math.abs(hashCode(prompt)) % templates.length;
  return templates[idx];
}

function extractAction(prompt: string) {
  if (!prompt || prompt.trim().length === 0) return 'take a 5-minute step toward your goal';
  // Very small heuristic: try to pull a verb phrase or fallback to actionable suggestion
  const match = prompt.match(/(?:to\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+){0,4})/i);
  if (match && match[1].length > 2) return `try: ${match[1].trim()}`;
  return 'take a 5-minute step toward your goal';
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
