import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { projectAssistant } from '../mastra/agents/project-assistant';
import { getMemoryStore } from '../storage/MemoryStoreFactory';
import type { Message } from '../types/memory.types';
import { mapToolCallsForMemory, getToolDisplayName } from '../utils/toolCallMapper';

const router = Router();

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  threadId: z.string().optional()
});

const memoryStore = getMemoryStore();

router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = ChatRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validationResult.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { message, threadId: requestThreadId } = validationResult.data;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);

    try {
      let threadId = requestThreadId;
      let conversationHistory = '';

      if (threadId) {
        const thread = await memoryStore.getThread(threadId);
        if (thread) {
          const recentMessages = await memoryStore.getRecentMessages(threadId, 10);
          conversationHistory = recentMessages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
        } else {
          console.warn(`Thread ${threadId} not found, creating new thread`);
          const newThread = await memoryStore.createThread();
          threadId = newThread.threadId;
        }
      } else {
        const newThread = await memoryStore.createThread();
        threadId = newThread.threadId;
      }

      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      await memoryStore.addMessage(threadId, userMessage);

      const contextualMessage = conversationHistory 
        ? `Previous conversation:\n${conversationHistory}\n\nUser: ${message}`
        : message;

      res.write(`event: status\ndata: ${JSON.stringify({ 
        status: 'thinking', 
        message: '🤔 Analyzing your request...' 
      })}\n\n`);

      const stream = await projectAssistant.stream([
        { role: 'user', content: contextualMessage }
      ]);

      const toolCalls: any[] = [];
      let fullText = '';

      res.write(`event: status\ndata: ${JSON.stringify({ 
        status: 'generating', 
        message: '✍️ Generating response...' 
      })}\n\n`);

      for await (const chunk of stream.textStream) {
        fullText += chunk;

        res.write(`event: chunk\ndata: ${JSON.stringify({ 
          chunk,
          type: 'text' 
        })}\n\n`);

        await new Promise(resolve => setTimeout(resolve, 10));
      }
      const finishReason = await stream.finishReason;
      const usage = await stream.usage;
      const rawToolCalls = await stream.toolCalls;

      console.log(`[Chat] Stream finished:`, {
        finishReason,
        usage,
        textLength: fullText.length
      });

      const memoryToolCalls = mapToolCallsForMemory(rawToolCalls as unknown[]);

      if (memoryToolCalls.length > 0) {
        console.log('[Chat] Tools used:', memoryToolCalls.map(tc => tc.name).join(', '));

        for (const tc of memoryToolCalls) {
          res.write(`event: tool\ndata: ${JSON.stringify({ 
            tool: tc.name,
            displayName: getToolDisplayName(tc.name),
            arguments: tc.arguments 
          })}\n\n`);
        }
      }

      // Save assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullText,
        timestamp: new Date(),
        toolCalls: memoryToolCalls
      };
      await memoryStore.addMessage(threadId, assistantMessage);

      res.write(`event: complete\ndata: ${JSON.stringify({ 
        text: fullText,
        threadId,
        toolCalls: memoryToolCalls,
        usage,
        finishReason
      })}\n\n`);

      res.write(`event: end\ndata: ${JSON.stringify({ status: 'ended' })}\n\n`);
      res.end();

    } catch (agentError) {
      console.error('Agent error:', agentError);
      
      res.write(`event: error\ndata: ${JSON.stringify({ 
        error: 'Agent processing error',
        message: agentError instanceof Error ? agentError.message : 'Unknown agent error'
      })}\n\n`);
      
      res.write(`event: end\ndata: ${JSON.stringify({ status: 'ended' })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`);
      
      res.write(`event: end\ndata: ${JSON.stringify({ status: 'ended' })}\n\n`);
      res.end();
    }
  }
});

export default router;
