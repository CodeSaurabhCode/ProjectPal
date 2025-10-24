import { createTool } from '@mastra/core';
import { z } from 'zod';
import { MDocument } from '@mastra/rag';
import fs from 'fs';
import { envConfig } from '../../config/environment';

interface DocumentChunk {
  text: string;
  [key: string]: unknown;
}

export interface HandbookQueryResult {
  results: string;
  source: string;
}

const SEARCH_KEYWORDS = [
  'budget',
  'approval',
  'resource',
  'project',
  'kick-off',
  'team',
  'hours',
  'staff'
] as const;

const CHUNK_CONFIG = {
  strategy: 'recursive' as const,
  size: 300,
  overlap: 50
};

const FALLBACK_CHUNK_COUNT = 2;

function findRelevantChunks(chunks: DocumentChunk[], query: string): DocumentChunk[] {
  const queryLower = query.toLowerCase();
  
  return chunks.filter(chunk => {
    const chunkLower = chunk.text.toLowerCase();
    
    if (chunkLower.includes(queryLower)) {
      return true;
    }
    
    return SEARCH_KEYWORDS.some(keyword => 
      queryLower.includes(keyword) && chunkLower.includes(keyword)
    );
  });
}

function loadHandbook(): MDocument {
  try {
    const handbookPath = envConfig.handbookPath;
    
    if (!fs.existsSync(handbookPath)) {
      throw new Error(`Handbook file not found at: ${handbookPath}`);
    }
    
    const handbookContent = fs.readFileSync(handbookPath, 'utf-8');
    
    if (!handbookContent || handbookContent.trim().length === 0) {
      throw new Error('Handbook file is empty');
    }
    
    console.log('[RAG Tool] Loaded handbook from:', handbookPath, '- Size:', handbookContent.length, 'chars');
    
    return MDocument.fromText(handbookContent, {
      id: 'pm-handbook',
      metadata: { source: 'PM_handbook.txt' }
    });
  } catch (error) {
    console.error('[RAG Tool] Error loading handbook:', error);
    throw error;
  }
}

export const queryHandbook = createTool({
  id: 'query-handbook',
  description: 'Searches the PM Handbook for policy information including budget approvals, resource allocation, and project requirements',
  inputSchema: z.object({
    query: z.string().describe('The question to search in the handbook - can be about budget approval, resource allocation, project kick-off requirements, etc.')
  }),
  outputSchema: z.object({
    results: z.string().describe('Relevant content from the handbook'),
    source: z.string().describe('Source document name')
  }),
  execute: async (context): Promise<HandbookQueryResult> => {
    try {
      // Extract query from the context - it's in context.context.query
      const query = (context as any)?.context?.query || (context as any)?.query || (context as any)?.input?.query;
      
      if (!query) {
        console.error('[RAG Tool] No query provided in context:', context);
        return {
          results: 'No query provided.',
          source: 'Error'
        };
      }
      
      console.log('[RAG Tool] Querying handbook with:', query);
      console.log('[RAG Tool] Handbook path:', envConfig.handbookPath);
      
      const doc = loadHandbook();
      console.log('[RAG Tool] Handbook loaded successfully');
      
      const chunks = (await doc.chunk(CHUNK_CONFIG)) as unknown as DocumentChunk[];
      console.log('[RAG Tool] Chunked into', chunks.length, 'chunks');
      
      let relevantChunks = findRelevantChunks(chunks, query);
      console.log('[RAG Tool] Found', relevantChunks.length, 'relevant chunks');
      
      if (relevantChunks.length === 0) {
        relevantChunks = chunks.slice(0, FALLBACK_CHUNK_COUNT);
        console.log('[RAG Tool] Using fallback chunks:', FALLBACK_CHUNK_COUNT);
      }
      
      const results = relevantChunks.length > 0
        ? relevantChunks.map(chunk => chunk.text).join('\n\n')
        : 'No relevant information found in the PM Handbook.';
      
      console.log('[RAG Tool] Returning results, length:', results.length);
      
      return {
        results,
        source: 'PM_handbook.txt'
      };
    } catch (error) {
      console.error('[RAG Tool] Error querying handbook:', error);
      console.error('[RAG Tool] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      return {
        results: `Error accessing the PM Handbook: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'Error'
      };
    }
  }
});
