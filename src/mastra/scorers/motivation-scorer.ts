import { z } from 'zod';
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/code';
import { createCompletenessScorer } from '@mastra/evals/scorers/code';
import { createScorer } from '@mastra/core/scores';

export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  // This must match the tool id in `motivation-tool.ts` ("generate-motivation").
  expectedTool: 'generate-motivation',
  strictMode: false,
});

export const completenessScorer = createCompletenessScorer();

// Custom LLM-judged scorer: evaluates if the assistant's tone is encouraging and actionable
export const toneScorer = createScorer({
  name: 'Motivational Tone',
  description: 'Checks that responses are encouraging, empathetic, and provide at least one concrete next step when appropriate',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-pro',
    instructions:
      'You are an expert evaluator of motivational tone. Determine whether the assistant message is encouraging, empathetic, and provides at least one small actionable step when appropriate. Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    return { userText, assistantText };
  })
  .analyze({
    description: 'Assess encouragement, empathy, and actionability',
    outputSchema: z.object({
      encouraging: z.boolean(),
      actionable: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
            You are evaluating if an assistant's response is motivational and actionable.
            User text:
            """
            ${results.preprocessStepResult.userText}
            """
            Assistant response:
            """
            ${results.preprocessStepResult.assistantText}
            """
            Tasks:
            1) Is the assistant encouraging and empathetic? (true/false)
            2) Does the assistant provide at least one small, specific, actionable next step when appropriate? (true/false)
            3) Return JSON with fields:
            {
            "encouraging": boolean,
            "actionable": boolean,
            "confidence": number, // 0-1
            "explanation": string
            }
        `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    if (!r.encouraging) return 0;
    let base = r.actionable ? 0.8 : 0.6;
    base = Math.max(0, Math.min(1, base + 0.2 * (r.confidence ?? 1)));
    return base;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Tone scoring: encouraging=${r.encouraging ?? false}, actionable=${r.actionable ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ''}`;
  });

export const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  toneScorer,
};
