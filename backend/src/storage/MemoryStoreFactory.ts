import { IMemoryStore } from '../types/memory.types';
import { FileMemoryStore } from './FileMemoryStore';
import { CosmosMemoryStore } from './CosmosMemoryStore';
import { envConfig } from '../config/environment';

export class MemoryStoreFactory {
  private static instance: IMemoryStore | null = null;

  static getInstance(): IMemoryStore {
    if (this.instance) {
      return this.instance;
    }

    const storageType = process.env.MEMORY_STORAGE_TYPE || 'file';

    if (storageType === 'cosmos') {
      console.log('🌐 Using Cosmos DB for memory storage');
      
      const endpoint = process.env.COSMOS_DB_ENDPOINT;
      const key = process.env.COSMOS_DB_KEY;

      if (!endpoint || !key) {
        console.error('❌ Cosmos DB credentials not configured, falling back to file storage');
        this.instance = new FileMemoryStore();
      } else {
        this.instance = new CosmosMemoryStore(
          endpoint,
          key,
          process.env.COSMOS_DB_DATABASE || 'ProjectPalDB',
          process.env.COSMOS_DB_CONTAINER || 'Conversations'
        );
      }
    } else {
      console.log('📁 Using file-based memory storage');
      const memoryDir = process.env.MEMORY_DIR || './memory';
      this.instance = new FileMemoryStore(memoryDir);
    }

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}

export function getMemoryStore(): IMemoryStore {
  return MemoryStoreFactory.getInstance();
}