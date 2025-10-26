import { MastraVector, type QueryResult, type IndexStats } from '@mastra/core/vector';
import type { 
  CreateIndexParams, 
  UpsertVectorParams, 
  QueryVectorParams, 
  UpdateVectorParams,
  DeleteVectorParams,
  DescribeIndexParams,
  DeleteIndexParams,
} from '@mastra/core/vector';
import fs from 'fs/promises';
import path from 'path';
import { CosmosClient, Container } from '@azure/cosmos';
import { envConfig } from '../config/environment';

interface StoredVector {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}

interface CosmosDocument {
  id: string;
  text?: string;
  embedding: number[];
  metadata: Record<string, any> & {
    source: string;
  };
}

export class MastraVectorStore extends MastraVector {
  private static readonly LOCAL_STORAGE_PATH = path.join(process.cwd(), 'embeddings');
  private cosmosClient: CosmosClient | null = null;
  private cosmosContainer: Container | null = null;
  
  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (envConfig.storageType === 'local') {
      await fs.mkdir(MastraVectorStore.LOCAL_STORAGE_PATH, { recursive: true });
      console.log('[MastraVectorStore] Local storage initialized at:', MastraVectorStore.LOCAL_STORAGE_PATH);
    } else {
      console.log('[MastraVectorStore] Initializing Cosmos DB storage...');
      await this.initializeCosmosDB();
      console.log('[MastraVectorStore] ✅ Cosmos DB initialized');
    }
  }

  private async initializeCosmosDB(): Promise<void> {
    const connectionString = envConfig.cosmosConnectionString;
    
    if (!connectionString) {
      throw new Error('COSMOS_CONNECTION_STRING not found in environment');
    }

    this.cosmosClient = new CosmosClient(connectionString);
    
    const { database } = await this.cosmosClient.databases.createIfNotExists({
      id: envConfig.cosmosDatabaseName || 'ProjectPal'
    });

    const { container } = await database.containers.createIfNotExists({
      id: envConfig.cosmosContainerName || 'embeddings',
      partitionKey: { paths: ['/metadata/source'] },
      indexingPolicy: {
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/embedding/*' }],
        vectorIndexes: [{
          path: '/embedding',
          type: 'quantizedFlat' as any
        }]
      },
      vectorEmbeddingPolicy: {
        vectorEmbeddings: [{
          path: '/embedding',
          dataType: 'float32' as any,
          dimensions: 1536,
          distanceFunction: 'cosine' as any
        }]
      }
    });

    this.cosmosContainer = container;
    console.log('[MastraVectorStore] Cosmos DB container ready:', container.id);
  }

  async createIndex(params: CreateIndexParams): Promise<void> {
    const { indexName } = params;
    console.log(`[MastraVectorStore] Creating index: ${indexName}`);
    
    if (envConfig.storageType === 'local') {
      await fs.mkdir(MastraVectorStore.LOCAL_STORAGE_PATH, { recursive: true });
    } else {
    }
  }

  async upsert(params: UpsertVectorParams): Promise<string[]> {
    const { indexName, vectors, metadata = [], ids = [] } = params;
    
    console.log(`[MastraVectorStore] Upserting ${vectors.length} vectors to index: ${indexName}`);
    
    // Generate IDs if not provided
    const vectorIds = ids.length === vectors.length 
      ? ids 
      : vectors.map((_, idx) => `${indexName}-${Date.now()}-${idx}`);
    
    const documents: StoredVector[] = vectors.map((vector, idx) => ({
      id: vectorIds[idx],
      vector,
      metadata: metadata[idx] || {},
    }));

    if (envConfig.storageType === 'local') {
      await this.upsertLocal(indexName, documents);
    } else {
      await this.upsertCosmos(indexName, documents);
    }
    
    return vectorIds;
  }

  async query(params: QueryVectorParams): Promise<QueryResult[]> {
    const { indexName, queryVector, topK = 5, includeVector = false } = params;
    
    console.log(`[MastraVectorStore] Querying index: ${indexName}, topK: ${topK}`);
    
    if (envConfig.storageType === 'local') {
      return await this.queryLocal(indexName, queryVector, topK, includeVector);
    } else {
      return await this.queryCosmos(indexName, queryVector, topK, includeVector);
    }
  }

  async listIndexes(): Promise<string[]> {
    if (envConfig.storageType === 'local') {
      try {
        const files = await fs.readdir(MastraVectorStore.LOCAL_STORAGE_PATH);
        return files
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace('.json', ''));
      } catch (error) {
        return [];
      }
    } else {
      if (!this.cosmosContainer) {
        await this.initializeCosmosDB();
      }
      
      const query = 'SELECT DISTINCT VALUE c.metadata.source FROM c';
      const { resources } = await this.cosmosContainer!.items.query(query).fetchAll();
      return resources;
    }
  }

  async describeIndex(params: DescribeIndexParams): Promise<IndexStats> {
    const { indexName } = params;
    
    if (envConfig.storageType === 'local') {
      const documents = await this.getLocalDocuments(indexName);
      const dimension = documents.length > 0 && documents[0]?.vector?.length 
        ? documents[0].vector.length 
        : 1536;
      return {
        dimension,
        count: documents.length,
        metric: 'cosine',
      };
    } else {
      const documents = await this.getCosmosDocuments(indexName);
      const dimension = documents.length > 0 && documents[0]?.embedding?.length 
        ? documents[0].embedding.length 
        : 1536;
      return {
        dimension,
        count: documents.length,
        metric: 'cosine',
      };
    }
  }

  async deleteIndex(params: DeleteIndexParams): Promise<void> {
    const { indexName } = params;
    console.log(`[MastraVectorStore] Deleting index: ${indexName}`);
    
    if (envConfig.storageType === 'local') {
      const filePath = path.join(MastraVectorStore.LOCAL_STORAGE_PATH, `${indexName}.json`);
      try {
        await fs.unlink(filePath);
      } catch (error) {
      }
    } else {
      if (!this.cosmosContainer) {
        await this.initializeCosmosDB();
      }
      const query = {
        query: 'SELECT c.id FROM c WHERE c.metadata.source = @source',
        parameters: [{ name: '@source', value: indexName }]
      };
      
      const { resources } = await this.cosmosContainer!.items.query(query).fetchAll();
      
      await Promise.all(
        resources.map(doc => 
          this.cosmosContainer!.item(doc.id, indexName).delete()
        )
      );
    }
  }

  async updateVector(params: UpdateVectorParams): Promise<void> {
    const { indexName, id, update } = params;
    
    if (envConfig.storageType === 'local') {
      const documents = await this.getLocalDocuments(indexName);
      const index = documents.findIndex(doc => doc.id === id);
      
      if (index >= 0) {
        if (update.vector) {
          documents[index].vector = update.vector;
        }
        if (update.metadata) {
          documents[index].metadata = { ...documents[index].metadata, ...update.metadata };
        }
        await this.saveLocalDocuments(indexName, documents);
      }
    } else {
      if (!this.cosmosContainer) {
        await this.initializeCosmosDB();
      }
      
      const { resource } = await this.cosmosContainer!.item(id, indexName).read<CosmosDocument>();
      
      if (resource) {
        const updated: CosmosDocument = {
          ...resource,
          embedding: update.vector || resource.embedding,
          metadata: { ...resource.metadata, ...(update.metadata || {}) },
        };
        
        await this.cosmosContainer!.items.upsert(updated);
      }
    }
  }

  async deleteVector(params: DeleteVectorParams): Promise<void> {
    const { indexName, id } = params;
    
    if (envConfig.storageType === 'local') {
      const documents = await this.getLocalDocuments(indexName);
      const filtered = documents.filter(doc => doc.id !== id);
      await this.saveLocalDocuments(indexName, filtered);
    } else {
      if (!this.cosmosContainer) {
        await this.initializeCosmosDB();
      }
      
      await this.cosmosContainer!.item(id, indexName).delete();
    }
  }

  private async upsertLocal(indexName: string, documents: StoredVector[]): Promise<void> {
    const existing = await this.getLocalDocuments(indexName);
    const docMap = new Map(existing.map(doc => [doc.id, doc]));
    
    documents.forEach(doc => docMap.set(doc.id, doc));
    
    await this.saveLocalDocuments(indexName, Array.from(docMap.values()));
  }

  private async upsertCosmos(indexName: string, documents: StoredVector[]): Promise<void> {
    if (!this.cosmosContainer) {
      await this.initializeCosmosDB();
    }

    const cosmosDocuments: CosmosDocument[] = documents.map(doc => ({
      id: doc.id,
      text: (doc.metadata?.text as string) || '',
      embedding: doc.vector,
      metadata: {
        source: indexName,
        ...doc.metadata,
      },
    }));

    await Promise.all(
      cosmosDocuments.map(doc => this.cosmosContainer!.items.upsert(doc))
    );
  }

  private async queryLocal(
    indexName: string, 
    queryVector: number[], 
    topK: number,
    includeVector: boolean
  ): Promise<QueryResult[]> {
    const documents = await this.getLocalDocuments(indexName);
    
    const results = documents
      .filter(doc => doc.vector && doc.vector.length > 0)
      .map(doc => ({
        id: doc.id,
        score: this.cosineSimilarity(queryVector, doc.vector),
        metadata: doc.metadata,
        vector: includeVector ? doc.vector : undefined,
      }));
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private async queryCosmos(
    indexName: string, 
    queryVector: number[], 
    topK: number,
    includeVector: boolean
  ): Promise<QueryResult[]> {
    if (!this.cosmosContainer) {
      await this.initializeCosmosDB();
    }

    try {
      const querySpec = {
        query: `
          SELECT TOP @topK 
            c.id, 
            c.text,
            c.metadata,
            ${includeVector ? 'c.embedding,' : ''}
            VectorDistance(c.embedding, @queryVector) AS score
          FROM c
          WHERE c.metadata.source = @source
          ORDER BY VectorDistance(c.embedding, @queryVector)
        `,
        parameters: [
          { name: '@topK', value: topK },
          { name: '@queryVector', value: queryVector },
          { name: '@source', value: indexName }
        ]
      };

      const { resources } = await this.cosmosContainer!.items.query(querySpec).fetchAll();

      return resources.map((r: any) => ({
        id: r.id,
        score: 1 - r.score, // Convert distance to similarity
        metadata: r.metadata,
        document: r.text,
        vector: includeVector ? r.embedding : undefined,
      }));
    } catch (error) {
      console.error('[MastraVectorStore] Cosmos vector search error, falling back to client-side:', error);
      
      // Fallback to client-side similarity
      const documents = await this.getCosmosDocuments(indexName);
      const results = documents.map(doc => ({
        id: doc.id,
        score: this.cosineSimilarity(queryVector, doc.embedding),
        metadata: doc.metadata,
        document: doc.text,
        vector: includeVector ? doc.embedding : undefined,
      }));
      
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }
  }

  private async getLocalDocuments(indexName: string): Promise<StoredVector[]> {
    const filePath = path.join(MastraVectorStore.LOCAL_STORAGE_PATH, `${indexName}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  private async saveLocalDocuments(indexName: string, documents: StoredVector[]): Promise<void> {
    const filePath = path.join(MastraVectorStore.LOCAL_STORAGE_PATH, `${indexName}.json`);
    await fs.writeFile(filePath, JSON.stringify(documents, null, 2), 'utf-8');
  }

  private async getCosmosDocuments(indexName: string): Promise<CosmosDocument[]> {
    if (!this.cosmosContainer) {
      await this.initializeCosmosDB();
    }

    const querySpec = {
      query: 'SELECT * FROM c WHERE c.metadata.source = @source',
      parameters: [{ name: '@source', value: indexName }]
    };

    const { resources } = await this.cosmosContainer!.items
      .query<CosmosDocument>(querySpec)
      .fetchAll();

    return resources;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
      console.error('[MastraVectorStore] Invalid vectors for similarity calculation');
      return 0;
    }
    
    if (vecA.length !== vecB.length) {
      console.error(`[MastraVectorStore] Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }
}

// Export singleton instance
export const vectorStore = new MastraVectorStore();
