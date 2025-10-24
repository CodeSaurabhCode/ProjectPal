import { createTool } from '@mastra/core';
import { z } from 'zod';
import { MDocument } from '@mastra/rag';
import fs from 'fs';
import path from 'path';

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
  const handbookPath = path.join(process.cwd(), 'docs', 'PM_handbook.txt');
  const handbookContent = fs.readFileSync(handbookPath, 'utf-8');
  
  return MDocument.fromText(handbookContent, {
    id: 'pm-handbook',
    metadata: { source: 'PM_handbook.txt' }
  });
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
      // Mastra passes parameters through context object - access via context properties
      // Using type assertion due to Mastra's dynamic context structure
      const query = (context as any)?.query || (context as any)?.input?.query;
      
      if (!query) {
        return {
          results: 'No query provided.',
          source: 'Error'
        };
      }
      
      
      const doc = loadHandbook();
      const chunks = (await doc.chunk(CHUNK_CONFIG)) as unknown as DocumentChunk[];
      
      let relevantChunks = findRelevantChunks(chunks, query);
      
      if (relevantChunks.length === 0) {
        relevantChunks = chunks.slice(0, FALLBACK_CHUNK_COUNT);
      }
      
      const results = relevantChunks.length > 0
        ? relevantChunks.map(chunk => chunk.text).join('\n\n')
        : 'No relevant information found in the PM Handbook.';
      
      return {
        results,
        source: 'PM_handbook.txt'
      };
    } catch (error) {
      console.error('Error querying handbook:', error);
      
      return {
        results: 'Error accessing the PM Handbook. Please try again.',
        source: 'Error'
      };
    }
  }
});
