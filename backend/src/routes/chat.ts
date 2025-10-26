import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { projectAssistant } from '../mastra/agents/project-assistant';
import { SSEService } from '../services/SSEService';
import { getMemoryStore } from '../storage/MemoryStoreFactory';
import type { Message } from '../types/memory.types';
import { mapToolCallsForMemory, getToolDisplayName } from '../utils/toolCallMapper';

const router = Router();

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  threadId: z.string().optional()
});

const sseService = new SSEService();
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

    sseService.setupHeaders(res);
    sseService.sendConnected(res);

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

      sseService.sendStatus(res, 'thinking', '🤔 Analyzing your request...');
      
      const result = await projectAssistant.generate(contextualMessage);
      const responseText = result.text || 'No response generated';

      const rawToolCalls = (result.toolCalls as unknown[]) || [];
      const memoryToolCalls = mapToolCallsForMemory(rawToolCalls);

      if (memoryToolCalls.length > 0) {
        console.log('[Chat] Tools used:', memoryToolCalls.map(tc => tc.name).join(', '));
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        toolCalls: memoryToolCalls
      };
      await memoryStore.addMessage(threadId, assistantMessage);

      if (memoryToolCalls.length > 0) {
        for (const tc of memoryToolCalls) {
          sseService.sendStatus(res, 'tool_use', `🔧 ${getToolDisplayName(tc.name)}...`, tc.name);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      sseService.sendStatus(res, 'generating', '✍️ Generating response...');
      await sseService.streamTextChunks(res, responseText);
      sseService.sendComplete(res, responseText, memoryToolCalls as any, threadId);
      
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

export default router;
