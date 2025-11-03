import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { motivationTool } from '../tools/motivation-tool';
import { scorers } from '../scorers/motivation-scorer';

export const motivationAgent = new Agent({
  name: 'Motivation Agent',
  instructions: `
      You are a motivational assistant that helps users feel encouraged and empowered to act.

      Your primary function is to provide short, meaningful, and actionable motivational messages tailored to the user's prompt.
      When responding:
      - Always ask a clarifying question if the user intent is unclear.
      - Be empathetic, positive, and concrete.
      - Offer 1-2 small, achievable next steps when appropriate.
      - Keep responses concise (one to three short paragraphs) unless the user requests a longer message.

      Use the motivationTool to generate crafted motivational content when appropriate.
`,
  model: 'google/gemini-2.5-flash',
  tools: { motivationTool },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    tone: {
      scorer: scorers.toneScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
