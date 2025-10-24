import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { projectAssistant } from './mastra/agents/project-assistant';
import { SSEService, type ToolCall } from './services/SSEService';
import { envConfig } from './config/environment';

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long')
});

function validateChatRequest(body: unknown) {
  return ChatRequestSchema.safeParse(body);
}

const sseService = new SSEService();
const app = express();
const port = envConfig.port;

app.use(cors({
  origin: envConfig.allowedOrigins as unknown as string[],
  credentials: true
}));
app.use(express.json());


app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const validationResult = validateChatRequest(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validationResult.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { message } = validationResult.data;

    sseService.setupHeaders(res);
    sseService.sendConnected(res);

    try {
      // Send thinking status BEFORE generating
      sseService.sendStatus(res, 'thinking', '🤔 Analyzing your request...');

      const result = await projectAssistant.generate(message);
      const responseText = result.text || 'No response generated';
      const toolCalls = (result.toolCalls as unknown as ToolCall[]) || [];

      // Send tool call statuses
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const toolName = sseService.extractToolName(toolCall);
          sseService.sendStatus(res, 'tool_use', `🔧 Using tool: ${toolName}`, toolName);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      sseService.sendStatus(res, 'generating', '✍️ Generating response...');

      // Stream the text word by word
      await sseService.streamTextChunks(res, responseText);

      sseService.sendComplete(res, responseText, toolCalls);
      
    } catch (agentError) {
      console.error('Agent error:', agentError);
      sseService.sendError(
        res,
        'Agent processing error',
        agentError instanceof Error ? agentError.message : 'Unknown agent error'
      );
    }

    sseService.sendEnd(res);

  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      sseService.sendError(
        res,
        'Internal server error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      sseService.sendEnd(res);
    }
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    agent: 'projectAssistant'
  });
});


app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🤖 Chat endpoint: http://localhost:${port}/api/chat`);
  console.log(`💚 Health check: http://localhost:${port}/api/health`);
  
  try {
    const hasKey = !!envConfig.openAIKey;
    console.log(`🔑 OpenAI API Key: ${hasKey ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`🔑 OpenAI API Key: ❌ (${error instanceof Error ? error.message : 'Not configured'})`);
  }
});

export default app;