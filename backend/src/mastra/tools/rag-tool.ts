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

export const queryHandbookSmart = createTool({
  id: 'query-handbook-smart',
  description: `You are an intelligent retrieval assistant designed to search through all available internal documents 
(e.g., PM handbooks, policy manuals, architecture guides, technical notes, HR or compliance docs) 
and extract the most relevant, factual, and concise information in response to the user’s query.

Always follow these principles:
- Base your answer strictly on the retrieved document content.
- If the information is missing, say: "Not found in the available documents."
- Provide clear, well-structured responses and mention source document names if possible.
- Do not assume or fabricate information beyond what is provided in the context.
- When multiple sources are relevant, synthesize the answer logically.

Types of documents you might query:
- Project Management handbooks (budgeting, scheduling, risk handling, QA, reporting)
- Organizational or departmental policies (approval levels, compliance, HR)
- Technical or architectural guides (system design, deployment, tools integration)
- Training, onboarding, or governance materials
- Any other procedural or knowledge base documents

WHEN TO USE:
- To answer questions about organizational policies, PM practices, or technical processes.
- To look up project management or approval requirements.
- To find reference standards, frameworks, or documented procedures.
- To verify compliance, risk mitigation, or reporting methods.
- For “How do we handle...”, “What’s the process for...”, or “Where is the policy for...” type questions.

EXAMPLE QUERIES:
- "What’s the project approval threshold for new initiatives?"
- "Summarize the risk mitigation steps for project execution."
- "What are the QA testing standards defined in the handbook?"
- "Explain the escalation process for project delays."
- "How is resource allocation handled in cross-departmental projects?"
- "What’s the policy on budget revisions or scope changes?"
- "List the steps for creating a project ticket and assigning team members."
- "What are the compliance requirements for financial reporting?"
- "How do we integrate AI-based RAG with project management workflows?"
- "Describe the Azure deployment best practices mentioned in the architecture guide.`,
  
  inputSchema: z.object({
    query: z.string()
      .min(5, "Query too short - be specific about what you're looking for")
      .describe('Search query for policy information. Include specific details like dollar amounts, role names, or technical terms for better results.')
  }),
  
  outputSchema: z.object({
    answer: z.string().describe('Relevant policy content with citations'),
    sources: z.array(z.object({
      text: z.string().describe('Exact text from policy documents'),
      score: z.number().describe('Relevance score (0-1, higher is better)'),
      chunkIndex: z.number().describe('Section number in document')
    })),
    searchMethod: z.enum(['vector', 'keyword', 'hybrid']).describe('Search method used'),
    totalChunks: z.number().describe('Total sections searched')
  }),
  
  execute: async (context): Promise<EnhancedHandbookQueryResult> => {
    try {
      const query = (context as any)?.context?.query || (context as any)?.query || (context as any)?.input?.query;
      
      if (!query) {
        return {
          answer: 'No query provided. Please specify what information you need to search for.',
          sources: [],
          searchMethod: 'vector',
          totalChunks: 0
        };
      }
      
      console.log('[Policy Search Tool] Query:', query);

      const searchResults = await RAGService.search(query, {
        indexName: 'pm-handbook',
        topK: 5,
        threshold: 0.4,
      });
      
      console.log(`[Policy Search Tool] Found ${searchResults.length} relevant chunks`);

      if (searchResults.length === 0) {
        return {
          answer: `No information found for "${query}". 

Try:
- Rephrasing with more specific terms
- Including relevant details (amounts, roles, metrics)
- Using different keywords

Common topics: budget policies, resource allocation, project procedures, quality standards, risk management, compliance requirements.`,
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
      console.error('[Policy Search Tool] Error:', error);
      
      return {
        answer: `Error searching policy documents: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
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
  
  let answer = `**Policy Information** (Query: "${query}"):\n\n`;
  
  topResults.forEach((result, idx) => {
    const relevance = Math.round(result.score * 100);
    answer += `**[${relevance}% match]**\n${result.text}\n\n`;
    if (idx < topResults.length - 1) answer += `---\n\n`;
  });
  
  return answer;
}
