import { Response } from 'express';

export type SSEEventType = 
  | 'connected'
  | 'status'
  | 'chunk'
  | 'complete'
  | 'error'
  | 'end';

export type ProcessingStatus = 'thinking' | 'tool_use' | 'generating';

export interface ToolCall {
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

export interface SSEEvent {
  type: SSEEventType;
  status?: ProcessingStatus;
  message?: string;
  content?: string;
  tool?: string;
  response?: string;
  toolCalls?: ToolCall[];
  threadId?: string;
  error?: string;
  timestamp: string;
  details?: Array<{ field: string; message: string }>;
}

interface StreamingConfig {
  chunkSize: number;
  chunkDelayMs: number;
  toolStatusDelayMs: number;
}

const DEFAULT_CONFIG: StreamingConfig = {
  chunkSize: 10,
  chunkDelayMs: 50,
  toolStatusDelayMs: 300
};

export class SSEService {
  private config: StreamingConfig;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setupHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  }

  sendEvent(res: Response, event: SSEEvent): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  sendConnected(res: Response): void {
    this.sendEvent(res, {
      type: 'connected',
      timestamp: new Date().toISOString()
    });
  }

  sendStatus(res: Response, status: ProcessingStatus, message: string, tool?: string): void {
    this.sendEvent(res, {
      type: 'status',
      status,
      message,
      tool,
      timestamp: new Date().toISOString()
    });
  }

  sendChunk(res: Response, content: string): void {
    this.sendEvent(res, {
      type: 'chunk',
      content,
      timestamp: new Date().toISOString()
    });
  }

  sendComplete(res: Response, response: string, toolCalls: ToolCall[] = [], threadId?: string): void {
    this.sendEvent(res, {
      type: 'complete',
      response,
      toolCalls,
      threadId,
      timestamp: new Date().toISOString()
    });
  }

  sendError(res: Response, error: string, message?: string): void {
    this.sendEvent(res, {
      type: 'error',
      error,
      message,
      timestamp: new Date().toISOString()
    });
  }

  sendEnd(res: Response): void {
    this.sendEvent(res, {
      type: 'end',
      timestamp: new Date().toISOString()
    });
    res.end();
  }

  extractToolName(toolCall: ToolCall): string {
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

  async streamTextChunks(res: Response, text: string): Promise<void> {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += this.config.chunkSize) {
      const chunk = words.slice(i, i + this.config.chunkSize).join(' ');
      const hasMore = i + this.config.chunkSize < words.length;
      
      this.sendChunk(res, chunk + (hasMore ? ' ' : ''));
      await this.delay(this.config.chunkDelayMs);
    }
  }

  async streamResponse(
    res: Response,
    responseText: string,
    toolCalls: ToolCall[] = []
  ): Promise<void> {
    this.sendStatus(res, 'thinking', '🤔 Analyzing your request...');

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = this.extractToolName(toolCall);
        this.sendStatus(res, 'tool_use', `🔧 Using tool: ${toolName}`, toolName);
        await this.delay(this.config.toolStatusDelayMs);
      }
    }

    this.sendStatus(res, 'generating', '✍️ Generating response...');

    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i += this.config.chunkSize) {
      const chunk = words.slice(i, i + this.config.chunkSize).join(' ');
      const hasMore = i + this.config.chunkSize < words.length;
      
      this.sendChunk(res, chunk + (hasMore ? ' ' : ''));
      await this.delay(this.config.chunkDelayMs);
    }

    this.sendComplete(res, responseText, toolCalls);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
