import { CosmosClient, Container, Database } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { IMemoryStore, ConversationThread, Message } from '../types/memory.types';

export class CosmosMemoryStore implements IMemoryStore {
  private client: CosmosClient;
  private database: Database | null = null;
  private container: Container | null = null;
  private isInitialized: boolean = false;
  private threadCache: Map<string, ConversationThread> = new Map();

  constructor(
    private endpoint: string,
    private key: string,
    private databaseId: string = 'ProjectPalDB',
    private containerId: string = 'Conversations'
  ) {
    this.client = new CosmosClient({ endpoint, key });
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: this.databaseId
      });
      this.database = database;

      const { container } = await database.containers.createIfNotExists({
        id: this.containerId,
        partitionKey: { paths: ['/threadId'] }
      });
      this.container = container;

      this.isInitialized = true;
      console.log(`✅ Cosmos DB initialized: ${this.databaseId}/${this.containerId}`);
    } catch (error) {
      console.error('Error initializing Cosmos DB:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<Container> {
    await this.initialize();
    if (!this.container) {
      throw new Error('Cosmos DB container not initialized');
    }
    return this.container;
  }

  async getThread(threadId: string): Promise<ConversationThread | null> {
    try {
      if (this.threadCache.has(threadId)) {
        return this.threadCache.get(threadId)!;
      }
      
      const container = await this.ensureInitialized();
      const { resource } = await container.item(threadId, threadId).read();
      
      if (!resource) {
        return null;
      }

      const thread: ConversationThread = {
        ...resource,
        createdAt: new Date(resource.createdAt),
        updatedAt: new Date(resource.updatedAt),
        messages: resource.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };

      this.threadCache.set(threadId, thread);

      return thread;
    } catch (error: any) {
      if (error.code === 404) {
        if (this.threadCache.has(threadId)) {
          return this.threadCache.get(threadId)!;
        }
        return null;
      }
      console.error(`Error reading thread ${threadId}:`, error);
      throw error;
    }
  }

  async createThread(userId?: string, metadata?: Record<string, unknown>): Promise<ConversationThread> {
    const container = await this.ensureInitialized();
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

    await container.items.create(thread);
    console.log(`✅ Created new thread in Cosmos DB: ${threadId}`);
    
    this.threadCache.set(threadId, thread);
    setTimeout(() => this.threadCache.delete(threadId), 30000);
    
    return thread;
  }

  async addMessage(threadId: string, message: Message): Promise<void> {
    const container = await this.ensureInitialized();
    const thread = await this.getThread(threadId);
    
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    thread.messages.push(message);
    thread.updatedAt = new Date();

    this.threadCache.set(threadId, thread);

    await container.items.upsert(thread);
  }

  async getRecentMessages(threadId: string, limit: number = 10): Promise<Message[]> {
    const thread = await this.getThread(threadId);
    
    if (!thread) {
      return [];
    }

    return thread.messages.slice(-limit);
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      const container = await this.ensureInitialized();
      await container.item(threadId, threadId).delete();
      console.log(`🗑️  Deleted thread from Cosmos DB: ${threadId}`);
    } catch (error: any) {
      if (error.code !== 404) {
        console.error(`Error deleting thread ${threadId}:`, error);
        throw error;
      }
    }
  }

  async getUserThreads(userId: string): Promise<ConversationThread[]> {
    try {
      const container = await this.ensureInitialized();
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
        parameters: [
          {
            name: '@userId',
            value: userId
          }
        ]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      
      return resources.map(resource => ({
        ...resource,
        createdAt: new Date(resource.createdAt),
        updatedAt: new Date(resource.updatedAt),
        messages: resource.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error(`Error getting user threads for ${userId}:`, error);
      return [];
    }
  }
}