import { MDocument } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';
import { vectorStore } from './VectorStore';

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddingModel = openai.embedding('text-embedding-3-small');
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const result = await embeddingModel.doEmbed({ values: [text] });
    embeddings.push(result.embeddings[0]);
  }
  
  return embeddings;
}

export interface ProcessingStats {
  totalChunks: number;
  totalEmbeddings: number;
  processingTime: number;
  chunkIds: string[]; // IDs of chunks in vector store
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export class RAGService {
  static async initialize(): Promise<void> {
    console.log('[RAGService] Initializing...');
    await vectorStore.initialize();
    console.log('[RAGService] ✅ Initialized');
  }

  static async processDocument(
    text: string,
    documentId: string, // Document identifier for tracking
    options?: {
      maxSize?: number;
      overlap?: number;
    }
  ): Promise<ProcessingStats> {
    const startTime = Date.now();
    const { maxSize = 600, overlap = 100 } = options || {};
    
    // Always use 'pm-handbook' as the index name
    const indexName = 'pm-handbook';
    
    console.log(`[RAGService] Processing document: ${documentId} into index: ${indexName}`);
    
    const doc = MDocument.fromText(text);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize,
      overlap,
    });
    
    console.log(`[RAGService] Created ${chunks.length} chunks`);
    
    const embeddings = await generateEmbeddings(chunks.map(chunk => chunk.text));
    
    console.log(`[RAGService] Generated ${embeddings.length} embeddings`);
    
    // Create metadata with document source
    const metadata = chunks.map((chunk, idx) => ({
      text: chunk.text,
      documentId, // Track which document this chunk belongs to
      chunkIndex: idx,
      ...chunk.metadata,
    }));
    
    // Generate chunk IDs
    const chunkIds = chunks.map((_, idx) => `${documentId}-chunk-${idx}`);
    
    await vectorStore.upsert({
      indexName,
      vectors: embeddings,
      metadata,
      ids: chunkIds,
    });
    
    const processingTime = Date.now() - startTime;
    console.log(`[RAGService] ✅ Processing complete in ${processingTime}ms`);
    
    return {
      totalChunks: chunks.length,
      totalEmbeddings: embeddings.length,
      processingTime,
      chunkIds,
    };
  }

  static async search(
    query: string,
    options?: {
      indexName?: string;
      topK?: number;
      threshold?: number;
    }
  ): Promise<SearchResult[]> {
    const { indexName = 'pm-handbook', topK = 5, threshold = 0.5 } = options || {};
    
    console.log(`[RAGService] Searching: "${query}" in index: ${indexName}`);
    
    const embeddings = await generateEmbeddings([query]);
    const queryEmbedding = embeddings[0];
    
    const results = await vectorStore.query({
      indexName,
      queryVector: queryEmbedding,
      topK,
      includeVector: false,
    });

    const filteredResults = results
      .filter(r => r.score >= threshold)
      .map(r => ({
        id: r.id,
        text: r.document || r.metadata?.text || '',
        score: r.score,
        metadata: r.metadata,
      }));
    
    console.log(`[RAGService] Found ${filteredResults.length} results above threshold ${threshold}`);
    
    return filteredResults;
  }

  static async deleteIndex(indexName: string): Promise<void> {
    console.log(`[RAGService] Deleting index: ${indexName}`);
    await vectorStore.deleteIndex({ indexName });
    console.log(`[RAGService] ✅ Index deleted: ${indexName}`);
  }

  /**
   * Delete specific document chunks from pm-handbook index
   */
  static async deleteDocumentChunks(chunkIds: string[]): Promise<void> {
    const indexName = 'pm-handbook';
    console.log(`[RAGService] Deleting ${chunkIds.length} chunks from index: ${indexName}`);
    
    for (const chunkId of chunkIds) {
      await vectorStore.deleteVector({
        indexName,
        id: chunkId,
      });
    }
    
    console.log(`[RAGService] ✅ Deleted ${chunkIds.length} chunks`);
  }

  static async getStats(indexName: string = 'pm-handbook'): Promise<{
    totalDocuments: number;
    dimensions: number;
    metric: string;
  }> {
    const stats = await vectorStore.describeIndex({ indexName });
    
    return {
      totalDocuments: stats.count,
      dimensions: stats.dimension,
      metric: stats.metric || 'cosine',
    };
  }

  static async listIndexes(): Promise<string[]> {
    return await vectorStore.listIndexes();
  }
}
