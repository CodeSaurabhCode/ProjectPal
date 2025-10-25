import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IMemoryStore, ConversationThread, Message } from '../types/memory.types';

/**
 * File-based memory store for local development
 * Stores conversations in JSON files
 */
export class FileMemoryStore implements IMemoryStore {
  private memoryDir: string;

  constructor(memoryDir: string = './memory') {
    this.memoryDir = path.resolve(memoryDir);
    this.ensureMemoryDirectory();
  }

  /**
   * Ensure memory directory exists
   */
  private ensureMemoryDirectory(): void {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
      console.log(`📁 Created memory directory: ${this.memoryDir}`);
    }
  }

  /**
   * Get file path for a thread
   */
  private getThreadFilePath(threadId: string): string {
    return path.join(this.memoryDir, `${threadId}.json`);
  }

  /**
   * Get conversation thread by ID
   */
  async getThread(threadId: string): Promise<ConversationThread | null> {
    try {
      const filePath = this.getThreadFilePath(threadId);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const thread = JSON.parse(data);
      
      // Convert date strings back to Date objects
      thread.createdAt = new Date(thread.createdAt);
      thread.updatedAt = new Date(thread.updatedAt);
      thread.messages = thread.messages.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      return thread;
    } catch (error) {
      console.error(`Error reading thread ${threadId}:`, error);
      return null;
    }
  }

  /**
   * Create a new conversation thread
   */
  async createThread(userId?: string, metadata?: Record<string, unknown>): Promise<ConversationThread> {
    const threadId = uuidv4();
    const now = new Date();

    const thread: ConversationThread = {
      threadId,
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata
    };

    await this.saveThread(thread);
    console.log(`✅ Created new thread: ${threadId}`);
    
    return thread;
  }

  /**
   * Save thread to file
   */
  private async saveThread(thread: ConversationThread): Promise<void> {
    try {
      const filePath = this.getThreadFilePath(thread.threadId);
      fs.writeFileSync(filePath, JSON.stringify(thread, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error saving thread ${thread.threadId}:`, error);
      throw error;
    }
  }

  /**
   * Add a message to a thread
   */
  async addMessage(threadId: string, message: Message): Promise<void> {
    const thread = await this.getThread(threadId);
    
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    thread.messages.push(message);
    thread.updatedAt = new Date();

    await this.saveThread(thread);
  }

  /**
   * Get recent messages from a thread
   */
  async getRecentMessages(threadId: string, limit: number = 10): Promise<Message[]> {
    const thread = await this.getThread(threadId);
    
    if (!thread) {
      return [];
    }

    return thread.messages.slice(-limit);
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      const filePath = this.getThreadFilePath(threadId);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted thread: ${threadId}`);
      }
    } catch (error) {
      console.error(`Error deleting thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Get all threads for a user
   */
  async getUserThreads(userId: string): Promise<ConversationThread[]> {
    try {
      const files = fs.readdirSync(this.memoryDir);
      const threads: ConversationThread[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const threadId = file.replace('.json', '');
          const thread = await this.getThread(threadId);
          
          if (thread && thread.userId === userId) {
            threads.push(thread);
          }
        }
      }

      return threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error(`Error getting user threads for ${userId}:`, error);
      return [];
    }
  }
}
