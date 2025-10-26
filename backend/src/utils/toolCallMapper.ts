import type { ToolCall as MemoryToolCall } from '../types/memory.types';

interface MastraToolCall {
  payload?: {
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
  };
}

export function mapToolCallsForMemory(rawToolCalls: unknown[]): MemoryToolCall[] {
  if (!Array.isArray(rawToolCalls)) return [];
  
  return rawToolCalls.map((tc: any) => {
    const payload = tc.payload || {};
    return {
      id: payload.toolCallId || 'unknown',
      name: payload.toolName || 'unknown-tool',
      arguments: payload.args || {}
    };
  });
}

export function getToolDisplayName(toolName: string): string {
  const names: Record<string, string> = {
    'queryHandbook': 'Query Handbook',
    'getTeamDirectory': 'Team Directory',
    'createProjectTicket': 'Create Ticket'
  };
  return names[toolName] || toolName;
}
