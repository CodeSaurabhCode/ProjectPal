/**
 * Memory types for conversation storage
 */

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
  /**
   * Get conversation thread by ID
   */
  getThread(threadId: string): Promise<ConversationThread | null>;

  /**
   * Create a new conversation thread
   */
  createThread(userId?: string, metadata?: Record<string, unknown>): Promise<ConversationThread>;

  /**
   * Add a message to a thread
   */
  addMessage(threadId: string, message: Message): Promise<void>;

  /**
   * Get recent messages from a thread
   */
  getRecentMessages(threadId: string, limit?: number): Promise<Message[]>;

  /**
   * Delete a thread
   */
  deleteThread(threadId: string): Promise<void>;

  /**
   * Get all threads for a user
   */
  getUserThreads(userId: string): Promise<ConversationThread[]>;
}
