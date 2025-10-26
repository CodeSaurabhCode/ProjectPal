import { createTool } from '@mastra/core';
import { z } from 'zod';
import { RAGService, type SearchResult } from '../../services/RAGService';

export interface EnhancedHandbookQueryResult {
  answer: string;
  sources: Array<{
    text: string;
    score: number;
    chunkIndex: number;
  }>;
  searchMethod: 'vector' | 'keyword' | 'hybrid';
  totalChunks: number;
}


export const queryHandbookEnhanced = createTool({
  id: 'query-handbook-enhanced',
  description: 'Searches the PM Handbook using Mastra RAG framework with advanced semantic search (embeddings) for policy information including budget approvals, resource allocation, and project requirements. Returns relevant passages with citations.',
  inputSchema: z.object({
    query: z.string().describe('The question to search in the handbook - can be about budget approval, resource allocation, project kick-off requirements, etc.')
  }),
  outputSchema: z.object({
    answer: z.string().describe('Synthesized answer from relevant handbook content'),
    sources: z.array(z.object({
      text: z.string(),
      score: z.number(),
      chunkIndex: z.number()
    })).describe('Source passages used to generate answer'),
    searchMethod: z.enum(['vector', 'keyword', 'hybrid']).describe('Search method used'),
    totalChunks: z.number().describe('Total chunks searched')
  }),
  execute: async (context): Promise<EnhancedHandbookQueryResult> => {
    try {
      const query = (context as any)?.context?.query || (context as any)?.query || (context as any)?.input?.query;
      
      if (!query) {
        console.error('[Enhanced RAG Tool] No query provided');
        return {
          answer: 'No query provided.',
          sources: [],
          searchMethod: 'vector',
          totalChunks: 0
        };
      }
      
      console.log('[Enhanced RAG Tool] Query:', query);

      // Use Mastra RAG Service for search
      const searchResults = await RAGService.search(query, {
        indexName: 'pm-handbook',
        topK: 5,
        threshold: 0.5,
      });
      
      console.log(`[Enhanced RAG Tool] Found ${searchResults.length} relevant chunks`);
      
      if (searchResults.length === 0) {
        return {
          answer: 'No relevant information found in the PM Handbook for your query. Try rephrasing your question or asking about budget approval, resource allocation, or project kick-off requirements.',
          sources: [],
          searchMethod: 'vector',
          totalChunks: 0
        };
      }
      
      const sources = searchResults.map((result, idx) => ({
        text: result.text,
        score: Math.round(result.score * 100) / 100,
        chunkIndex: (result.metadata?.chunkIndex as number) || idx
      }));
      
      const answer = synthesizeAnswer(query, searchResults);
      
      const stats = await RAGService.getStats('pm-handbook');
      
      return {
        answer,
        sources,
        searchMethod: 'vector',
        totalChunks: stats.totalDocuments
      };
      
    } catch (error) {
      console.error('[Enhanced RAG Tool] Error:', error);
      
      return {
        answer: `Error searching handbook: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your question.`,
        sources: [],
        searchMethod: 'vector',
        totalChunks: 0
      };
    }
  }
});


function synthesizeAnswer(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No relevant information found.';
  }
  
  const topResults = results.slice(0, 5);
  
  const combinedText = topResults
    .map((result, idx) => {
      const score = Math.round(result.score * 100);
      return `[Source ${idx + 1}, Relevance: ${score}%]:\n${result.text}`;
    })
    .join('\n\n---\n\n');
  
  const header = `Based on ${results.length} relevant passage${results.length > 1 ? 's' : ''} from the PM Handbook:\n\n`;
  
  return header + combinedText;
}


export { queryHandbook } from './rag-tool';
