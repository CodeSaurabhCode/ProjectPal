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
  description: `Searches the Project Management Handbook for official policies, procedures, and requirements.

WHAT THIS HANDBOOK CONTAINS:
- Budget approval thresholds ($10K, $50K, $500K levels)
- Required approvers for different budget ranges (Team Lead, Manager, VP, Board)
- Resource allocation policies (minimum hours required)
- Project kick-off requirements (tickets, meetings, timelines)
- Staff assignment rules (HR checks, availability requirements)

WHEN TO USE THIS TOOL:
- User asks "what's the policy for..." or "what approval do I need..."
- Need to verify budget approval requirements
- Questions about "how much" approval is needed
- Clarifying resource allocation rules
- Any question about official procedures or requirements
- Before creating tickets (to check if policies are met)

WHEN NOT TO USE:
- Finding available people (use getTeamDirectory instead)
- Creating tickets (use createProjectTicket instead)
- User asking about their specific project status
- Questions about individual team members

QUERY TIPS FOR BEST RESULTS:
✅ Be specific: "budget approval for $25000 project" not just "budget"
✅ Include context: "resource requirements for Engineering Lead" not just "resources"
✅ Mention amounts: "approval needed for $75,000" gets better results
❌ Too vague: "project stuff" won't find relevant policies
❌ Too narrow: "exactly $14,999.99" - use ranges instead

WHAT YOU'LL GET BACK:
- Exact text from the handbook with relevance scores
- Multiple relevant passages if available
- Citations you can reference in your response
- If no results: handbook doesn't cover that topic

HOW TO USE THE RESULTS:
- ALWAYS cite the handbook when providing policy info
- Use exact numbers and thresholds from results
- Don't paraphrase if you got specific text
- If multiple results, present the most relevant one

EXAMPLE SCENARIOS:
✅ "What approval do I need for $15K?" → Query: "budget approval 15000"
✅ "Can I start a $100K project?" → Query: "budget approval requirements 100000"
✅ "Hours required for engineers?" → Query: "resource allocation engineering hours"
❌ "Who should I assign?" → Wrong tool, use getTeamDirectory
❌ "Create a ticket" → Wrong tool, use createProjectTicket

IMPORTANT NOTES:
- This searches POLICIES, not people
- Results are from official handbook, cite them
- If no results found, handbook doesn't cover that topic
- Don't make up policies if search returns nothing`,
  
  inputSchema: z.object({
    query: z.string()
      .min(5, "Query too short - be specific about what policy you need")
      .describe('Your search query. Be specific and include key details like dollar amounts, role names, or specific requirements you need to find.')
  }),
  
  outputSchema: z.object({
    answer: z.string().describe('Relevant handbook content with citations'),
    sources: z.array(z.object({
      text: z.string().describe('Exact text from handbook'),
      score: z.number().describe('Relevance score (0-1, higher is better)'),
      chunkIndex: z.number().describe('Section number in handbook')
    })),
    searchMethod: z.enum(['vector', 'keyword', 'hybrid']).describe('Search method used'),
    totalChunks: z.number().describe('Total sections searched')
  }),
  
  execute: async (context): Promise<EnhancedHandbookQueryResult> => {
    try {
      const query = (context as any)?.context?.query || (context as any)?.query || (context as any)?.input?.query;
      
      if (!query) {
        return {
          answer: 'No query provided. Please specify what policy or requirement you need to look up.',
          sources: [],
          searchMethod: 'vector',
          totalChunks: 0
        };
      }
      
      console.log('[Smart Handbook Tool] Query:', query);

      const searchResults = await RAGService.search(query, {
        indexName: 'pm-handbook',
        topK: 5,
        threshold: 0.5,
      });
      
      console.log(`[Smart Handbook Tool] Found ${searchResults.length} relevant chunks`);
      
      if (searchResults.length === 0) {
        return {
          answer: `No information found in the PM Handbook for "${query}". 

This could mean:
- This topic isn't covered in the handbook
- Try rephrasing with more specific terms (include dollar amounts, role names, etc.)
- Common searchable topics: budget approval, resource allocation, kick-off requirements

If this is a critical policy question, recommend consulting with leadership directly.`,
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
      console.error('[Smart Handbook Tool] Error:', error);
      
      return {
        answer: `Error searching handbook: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question or try again.`,
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
  
  const topResults = results.slice(0, 3); // Focus on top 3 most relevant
  
  let answer = `**From PM Handbook** (in response to: "${query}"):\n\n`;
  
  topResults.forEach((result, idx) => {
    const relevance = Math.round(result.score * 100);
    answer += `**[${relevance}% match]**\n${result.text}\n\n`;
    if (idx < topResults.length - 1) answer += `---\n\n`;
  });
  
  return answer;
}

