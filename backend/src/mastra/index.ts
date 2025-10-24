import { Mastra } from '@mastra/core/mastra';
import { projectAssistant } from '../mastra/agents/project-assistant';

export const mastra = new Mastra({
  agents: { projectAssistant }
});
