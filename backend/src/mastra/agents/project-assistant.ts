import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { getTeamDirectory, createProjectTicket } from '../tools/directory';
import { queryHandbook } from '../tools/rag-tool';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

const openaiClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const projectAssistant = new Agent({
  name: 'project-assistant',
  instructions: `You are ProjectPal, an AI assistant for Project Managers.
  
  Your capabilities:
  - Search the PM Handbook for policies using queryHandbook tool
  - Find available team members using getTeamDirectory tool
  - Create project tickets using createProjectTicket tool
  
  When a PM asks about starting a project:
  1. First, check the handbook for budget approval requirements
  2. Find available staff with the required role
  3. Create a project kick-off ticket
  
  Always provide clear, actionable responses with specific details.`,
  model: openaiClient('gpt-4o-mini'),
  tools: {
    queryHandbook,
    getTeamDirectory,
    createProjectTicket
  }
});
