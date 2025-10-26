# ToolCall Mapping Architecture

## Overview

This module provides robust, type-safe mapping between Mastra's toolCall structures and our internal memory format. It handles multiple toolCall formats and provides utilities for display and debugging.

## Problem Statement

Mastra agents return toolCalls in various formats:

### Format 1: Nested Payload Structure
```typescript
{
  from: "AGENT",
  payload: {
    toolCallId: "call_YkZUdS80h9gmNUTbWbySt0YV",
    toolName: "queryHandbook",
    args: { query: "budget approval requirements" },
    providerExecuted: undefined
  }
}
```

### Format 2: Direct Structure
```typescript
{
  id: "call_abc123",
  toolName: "getTeamDirectory",
  args: { role: "AI Engineer" }
}
```

### Format 3: Legacy Structure
```typescript
{
  toolCallId: "legacy_123",
  name: "createProjectTicket",
  arguments: { assignee: "John Doe" }
}
```

Our memory system expects a consistent format:
```typescript
{
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}
```

## Solution Architecture

### Type Definitions

```typescript
// Raw Mastra format (can vary)
interface MastraToolCall {
  from?: string;
  payload?: {
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    result?: unknown;
  };
  id?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
  // ... other possible fields
}

// Normalized internal format
interface NormalizedToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

// Memory storage format
interface MemoryToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}
```

### Core Functions

#### 1. `normalizeToolCall(tc: MastraToolCall): NormalizedToolCall`

Converts any Mastra toolCall format to our normalized internal format.

**Strategy:**
- Prioritizes `payload.*` properties first
- Falls back to direct properties
- Generates synthetic IDs if none exist
- Handles both `args` and `arguments` fields

**Example:**
```typescript
const mastraTC = {
  payload: {
    toolCallId: "call_123",
    toolName: "queryHandbook",
    args: { query: "budget" }
  }
};

const normalized = normalizeToolCall(mastraTC);
// { id: "call_123", toolName: "queryHandbook", args: { query: "budget" } }
```

#### 2. `normalizeToolCalls(toolCalls: unknown[]): NormalizedToolCall[]`

Batch normalizes an array of toolCalls.

#### 3. `mapToolCallsForMemory(rawToolCalls: unknown[]): MemoryToolCall[]`

All-in-one function: normalizes Mastra toolCalls and converts to memory format.

**Example:**
```typescript
const memoryFormat = mapToolCallsForMemory(result.toolCalls);
// [{ id: "call_123", name: "queryHandbook", arguments: { query: "budget" } }]
```

#### 4. `getToolDisplayName(normalized: NormalizedToolCall): string`

Converts technical tool names to user-friendly display names.

**Mappings:**
```typescript
'queryHandbook' → 'Query Handbook'
'getTeamDirectory' → 'Team Directory'
'createProjectTicket' → 'Create Ticket'
// CamelCase → Spaced Title Case for unknown tools
```

#### 5. `formatToolArgs(args: Record<string, unknown>): string`

Formats tool arguments for logging and debugging.

**Features:**
- Truncates long strings (> 50 chars)
- Pretty-prints JSON
- Handles empty arguments

## Usage in Server

### Before (Problematic)
```typescript
const toolCalls = result.toolCalls as ToolCall[];
// ❌ Assumes specific structure
// ❌ Doesn't handle nested payloads
// ❌ No type safety
```

### After (Robust)
```typescript
import { normalizeToolCalls, mapToolCallsForMemory, getToolDisplayName } from './utils/toolCallMapper';

// Generate response
const result = await projectAssistant.generate(message);
const rawToolCalls = result.toolCalls as unknown[];

// Normalize for internal use
const normalizedToolCalls = normalizeToolCalls(rawToolCalls);

// Log with friendly names
normalizedToolCalls.forEach(tc => {
  console.log(`Using ${getToolDisplayName(tc)}: ${formatToolArgs(tc.args)}`);
});

// Save to memory
const message: Message = {
  role: 'assistant',
  content: result.text,
  toolCalls: mapToolCallsForMemory(rawToolCalls)
};

// Send to client
sseService.sendStatus(res, 'tool_use', `🔧 Using ${getToolDisplayName(tc)}...`);
```

## Benefits

✅ **Type Safety** - Strongly typed interfaces prevent runtime errors  
✅ **Flexibility** - Handles multiple Mastra formats without breaking  
✅ **Maintainability** - Centralized mapping logic in one utility  
✅ **Debuggability** - Formatted display names and argument logging  
✅ **Testability** - Comprehensive unit tests cover all cases  
✅ **Future-Proof** - Easy to extend for new toolCall formats

## Testing

Run comprehensive tests:
```bash
npx tsx src/tests/toolCallMapper.test.ts
```

Tests cover:
- Nested payload structures
- Direct structures
- Legacy formats
- Array normalization
- Memory mapping
- Display names
- Argument formatting
- Edge cases (empty/missing data)

## Migration Guide

### Step 1: Update Imports
```typescript
// Remove
import { type ToolCall } from './services/SSEService';

// Add
import { normalizeToolCalls, mapToolCallsForMemory } from './utils/toolCallMapper';
```

### Step 2: Update ToolCall Handling
```typescript
// Old
const toolCalls = result.toolCalls as ToolCall[];
const name = toolCall.toolName || toolCall.name || 'unknown';

// New
const normalizedToolCalls = normalizeToolCalls(result.toolCalls);
const name = getToolDisplayName(normalizedToolCalls[0]);
```

### Step 3: Update Memory Storage
```typescript
// Old
toolCalls: result.toolCalls.map(tc => ({
  id: tc.id || 'unknown',
  name: tc.toolName || 'unknown',
  arguments: tc.args || {}
}))

// New
toolCalls: mapToolCallsForMemory(result.toolCalls)
```

## Appendix: Complete Example

```typescript
// Complete flow from agent generation to memory storage
async function handleChatMessage(message: string, threadId: string) {
  // 1. Generate response with tools
  const result = await projectAssistant.generate(message);
  const rawToolCalls = result.toolCalls as unknown[];
  
  // 2. Normalize for processing
  const normalizedToolCalls = normalizeToolCalls(rawToolCalls);
  
  // 3. Log tool usage
  if (normalizedToolCalls.length > 0) {
    console.log('[Tools Used]:');
    normalizedToolCalls.forEach(tc => {
      console.log(`  - ${getToolDisplayName(tc)}`);
      console.log(`    ${formatToolArgs(tc.args)}`);
    });
  }
  
  // 4. Send real-time updates to client
  for (const tc of normalizedToolCalls) {
    sseService.sendStatus(
      res, 
      'tool_use', 
      `🔧 ${getToolDisplayName(tc)}...`,
      tc.toolName
    );
  }
  
  // 5. Save to conversation memory
  const assistantMessage: Message = {
    role: 'assistant',
    content: result.text,
    timestamp: new Date(),
    toolCalls: mapToolCallsForMemory(rawToolCalls)
  };
  await memoryStore.addMessage(threadId, assistantMessage);
  
  // 6. Send completion to client
  sseService.sendComplete(
    res, 
    result.text, 
    normalizedToolCalls.map(tc => ({
      id: tc.id,
      name: tc.toolName,
      args: tc.args
    })),
    threadId
  );
}
```

## Future Enhancements

- [ ] Add toolCall duration tracking
- [ ] Support toolCall chaining/sequences
- [ ] Add retry/error tracking per tool
- [ ] Implement tool result validation
- [ ] Add tool-specific formatting (e.g., format SQL queries, API responses)
