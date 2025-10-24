import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { projectAssistant } from './mastra/agents/project-assistant';

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long')
});


interface ToolCall {
  id?: string;
  toolName?: string;
  name?: string;
  toolCallId?: string;
  tool?: {
    name?: string;
  };
  function?: {
    name?: string;
  };
  [key: string]: unknown;
}

type SSEEventType = 
  | 'connected'
  | 'status'
  | 'chunk'
  | 'complete'
  | 'error'
  | 'end';


type ProcessingStatus = 'thinking' | 'tool_use' | 'generating';


interface SSEEvent {
  type: SSEEventType;
  status?: ProcessingStatus;
  message?: string;
  content?: string;
  tool?: string;
  response?: string;
  toolCalls?: ToolCall[];
  error?: string;
  timestamp: string;
  details?: Array<{ field: string; message: string }>;
}


const STREAMING_CHUNK_SIZE = 10;
const CHUNK_DELAY_MS = 50;
const TOOL_STATUS_DELAY_MS = 300;
const ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'http://localhost:3000',
  'http://127.0.0.1:4321'
] as const;


function extractToolName(toolCall: ToolCall): string {
  const possibleNames = [
    toolCall.id,
    toolCall.toolName,
    toolCall.name,
    toolCall.tool?.name,
    toolCall.function?.name,
    toolCall.toolCallId
  ];
  
  return possibleNames.find(name => name && typeof name === 'string') || 'Processing tool';
}

function sendSSEEvent(res: Response, event: SSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateChatRequest(body: unknown) {
  return ChatRequestSchema.safeParse(body);
}

const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  console.error('❌ .env file not found at:', envPath);
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ALLOWED_ORIGINS as unknown as string[],
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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    sendSSEEvent(res, {
      type: 'connected',
      timestamp: new Date().toISOString()
    });

    try {
      sendSSEEvent(res, {
        type: 'status',
        status: 'thinking',
        message: '🤔 Analyzing your request...',
        timestamp: new Date().toISOString()
      });

      const result = await projectAssistant.generate(message);

      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          const toolName = extractToolName(toolCall as unknown as ToolCall);
          
          sendSSEEvent(res, {
            type: 'status',
            status: 'tool_use',
            message: `🔧 Using tool: ${toolName}`,
            tool: toolName,
            timestamp: new Date().toISOString()
          });
          
          await delay(TOOL_STATUS_DELAY_MS);
        }
      }
      
      sendSSEEvent(res, {
        type: 'status',
        status: 'generating',
        message: '✍️ Generating response...',
        timestamp: new Date().toISOString()
      });
      
      const responseText = result.text || 'No response generated';
      const words = responseText.split(' ');
      
      for (let i = 0; i < words.length; i += STREAMING_CHUNK_SIZE) {
        const chunk = words.slice(i, i + STREAMING_CHUNK_SIZE).join(' ');
        const hasMore = i + STREAMING_CHUNK_SIZE < words.length;
        
        sendSSEEvent(res, {
          type: 'chunk',
          content: chunk + (hasMore ? ' ' : ''),
          timestamp: new Date().toISOString()
        });
        
        await delay(CHUNK_DELAY_MS);
      }
      
      sendSSEEvent(res, {
        type: 'complete',
        response: responseText,
        toolCalls: (result.toolCalls as unknown as ToolCall[]) || [],
        timestamp: new Date().toISOString()
      });
      
    } catch (agentError) {
      console.error('Agent error:', agentError);
      
      sendSSEEvent(res, {
        type: 'error',
        error: 'Agent processing error',
        message: agentError instanceof Error ? agentError.message : 'Unknown agent error',
        timestamp: new Date().toISOString()
      });
    }

    sendSSEEvent(res, {
      type: 'end',
      timestamp: new Date().toISOString()
    });
    res.end();

  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      sendSSEEvent(res, {
        type: 'error',
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      res.end();
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
  console.log(` OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
});

export default app;