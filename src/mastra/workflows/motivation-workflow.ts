import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const motivationSchema = z.object({
  message: z.string(),
});

const generateMotivation = createStep({
  id: 'generate-motivation',
  description: 'Generates a short motivational message for the provided prompt',
  inputSchema: z.object({
    prompt: z.string().describe('A short description of the user situation or goal'),
  }),
  outputSchema: motivationSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error('Input data not found');

    const agent = mastra?.getAgent('motivationAgent');
    if (!agent) throw new Error('Motivation agent not found');

    const prompt = `Create a short, encouraging, and actionable motivational message for the following:
${inputData.prompt}

Keep it concise (1-3 short sentences) and include one concrete next step when appropriate.`;

    const response = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let text = '';
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      text += chunk;
    }

    return { message: text };
  },
});

const motivationWorkflow = createWorkflow({
  id: 'motivation-workflow',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt describing what the user needs motivation for'),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
})
  .then(generateMotivation);

motivationWorkflow.commit();

export { motivationWorkflow };
