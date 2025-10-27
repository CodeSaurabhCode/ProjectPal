export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ConversationThread {
  threadId: string;
  userId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IMemoryStore {

  getThread(threadId: string): Promise<ConversationThread | null>;

  createThread(userId?: string, metadata?: Record<string, unknown>): Promise<ConversationThread>;

  addMessage(threadId: string, message: Message): Promise<void>;

  getRecentMessages(threadId: string, limit?: number): Promise<Message[]>;

  deleteThread(threadId: string): Promise<void>;

  getUserThreads(userId: string): Promise<ConversationThread[]>;
}
