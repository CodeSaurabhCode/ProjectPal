# ProjectPal - AI Project Management Assistant

[![PR Validation](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/pr-validation.yml)
[![Deploy Applications](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/deploy-apps.yml/badge.svg)](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/deploy-apps.yml)

A complete full-stack AI-powered project management assistant with conversation memory, RAG capabilities, real-time streaming responses, and automated Azure deployment via CI/CD.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [Deployment](#deployment)

---

## Overview

ProjectPal is an intelligent project management assistant that helps teams with:

- **Team Management** - Find available team members by role and skills
- **Policy Queries** - Search PM handbook using RAG (Retrieval-Augmented Generation)
- **Ticket Creation** - Create and assign project tickets automatically
- **Natural Conversation** - Chat naturally with AI that maintains conversation context

Built with modern technologies and production-ready infrastructure, featuring:
- ✅ Real-time streaming responses (word-by-word with SSE)
- ✅ Persistent conversation memory (thread-based)
- ✅ Dual storage support (local files or Azure Cosmos DB)
- ✅ Full CI/CD automation (GitHub Actions → Azure)
- ✅ Scalable infrastructure (Terraform + Azure)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                   https://projectpal.app                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Astro Frontend (Static)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Chat UI      │  │ SSE Client   │  │ Markdown Renderer   │  │
│  │ Components   │  │ (Streaming)  │  │ (Syntax Highlight)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Server-Sent Events (SSE)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express Backend (Node.js + TypeScript)             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Mastra AI Framework                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ AI Agent     │  │ Memory Mgr   │  │ Tool Router  │  │   │
│  │  │ (GPT-4o-mini)│  │ (Threads)    │  │ (Functions)  │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │   │
│  └─────────┼──────────────────┼──────────────────┼──────────┘   │
│            │                  │                  │              │
│  ┌─────────▼──────────────────▼──────────────────▼──────────┐  │
│  │                  SSE Service Layer                       │  │
│  │  • Event Streaming  • Word-by-word chunks  • Status     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬───────────────┬───────────────┬────────────────┘
                 │               │               │
        ┌────────▼──────┐  ┌─────▼──────┐  ┌────▼────────────┐
        │  OpenAI API   │  │ Cosmos DB  │  │  Blob Storage   │
        │  (GPT-4o-mini)│  │ (Memory)   │  │  (PM Handbook)  │
        └───────────────┘  └────────────┘  └─────────────────┘
```

### Component Architecture

#### Frontend Layer (Astro)

```
frontend/src/
├── components/Chat/
│   ├── ChatHeader.astro          # App header with branding
│   ├── ChatMessages.astro        # Message list with markdown rendering
│   └── ChatInputArea.astro       # Input field + prompt suggestions
├── scripts/
│   └── chat.ts                   # SSE client, state management, streaming
├── layouts/
│   └── Layout.astro              # Base layout with global styles
└── pages/
    └── index.astro               # Main chat interface (entry point)
```

**Frontend Features:**
- **Real-time Streaming**: Server-Sent Events (SSE) for word-by-word AI responses
- **Dynamic UI**: Transitions from welcome screen to chat layout on first message
- **Status Indicators**: "Thinking...", "Using tool: X", "Generating response..."
- **Markdown Rendering**: Full markdown support with code syntax highlighting
- **Responsive Design**: Mobile-first, adapts to all screen sizes
- **Error Handling**: Connection retry logic, timeout handling

#### Backend Layer (Express + Mastra)

```
backend/src/
├── mastra/
│   ├── agents/
│   │   └── project-assistant.ts  # Main AI agent with tools + memory
│   ├── tools/
│   │   ├── directory.ts          # Team directory lookup tool
│   │   ├── rag-tool.ts           # PM handbook RAG search tool
│   │   └── ticket-tool.ts        # Project ticket creation tool
│   └── index.ts                  # Mastra framework configuration
├── services/
│   └── SSEService.ts             # Server-Sent Events streaming service
├── config/
│   └── environment.ts            # Environment config singleton pattern
├── data/
│   └── teamData.ts               # Team member data source
└── server.ts                     # Express app + API routes
```

**Backend Features:**
- **Mastra Framework**: Agent orchestration, tool calling, memory management
- **SSE Streaming**: Smooth response chunks (10 words/chunk, 50ms delay)
- **Dual Memory Storage**: Local JSON files (dev) or Azure Cosmos DB (production)
- **RAG Pipeline**: Vector search on PM handbook with error handling
- **Type Safety**: Zod schema validation, full TypeScript coverage
- **CORS Handling**: Configurable origins for frontend integration
- **Error Logging**: Comprehensive logging for debugging and monitoring

### Data Flow Architecture

#### Complete Chat Request Flow

```
User Types Message → Frontend
       │
       ▼
1. Frontend Processing (chat.ts)
   ├─→ hideSuggestions()              # Hide prompt suggestion cards
   ├─→ Add user message to UI
   ├─→ Show typing indicator
   │
   ▼
2. HTTP Request
   POST /api/chat
   Headers: { Content-Type: application/json }
   Body: { 
     message: "Who are the available data scientists?",
     threadId: "uuid-v4" 
   }
       │
       ▼
3. Backend Receives Request (server.ts)
   ├─→ Validate with Zod schema
   ├─→ Create SSE connection
   ├─→ Send event: { type: "connected", timestamp }
   │
   ▼
4. Mastra Agent Processing (project-assistant.ts)
   ├─→ Load conversation memory from thread
   ├─→ Send event: { type: "status", message: "Thinking..." }
   ├─→ Analyze user intent
   ├─→ Determine if tools are needed
   │
   ▼
5. Tool Execution (if needed)
   ├─→ Send event: { type: "status", message: "Using tool: getTeamDirectory" }
   ├─→ Execute tool function
   │   • getTeamDirectory({ role: "data scientist" })
   │   • Returns: [Sarah Chen, Alex Wong]
   ├─→ Tool results added to context
   │
   ▼
6. OpenAI API Call
   ├─→ Send event: { type: "status", message: "Generating response..." }
   ├─→ Build prompt with:
   │   • Conversation history (memory)
   │   • Tool results (if any)
   │   • System instructions
   ├─→ Call GPT-4o-mini API
   │   • Model: gpt-4o-mini
   │   • Temperature: 0.7
   │   • Max tokens: 1000
   ├─→ Receive AI response
   │
   ▼
7. Response Streaming (SSEService)
   ├─→ Split response into 10-word chunks
   ├─→ For each chunk:
   │   ├─→ Wait 50ms
   │   ├─→ Send event: { type: "chunk", content: "...", timestamp }
   │   └─→ Frontend appends to message
   │
   ▼
8. Completion
   ├─→ Send event: { 
   │     type: "complete",
   │     response: "full text",
   │     toolCalls: [...] 
   │   }
   ├─→ Save conversation to memory
   │   • Update thread in Cosmos DB or local file
   ├─→ Send event: { type: "end" }
   └─→ Close SSE connection
       │
       ▼
9. Frontend Display
   └─→ Show complete message with markdown formatting
```

### Memory System Architecture

**Thread-based Conversation Memory:**

```typescript
// Memory Structure
interface ConversationThread {
  threadId: string;              // UUID v4
  messages: Message[];
  metadata: {
    createdAt: string;           // ISO-8601
    updatedAt: string;           // ISO-8601
    messageCount: number;
    lastUserMessage?: string;
  };
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];        // If AI used tools
  toolResults?: ToolResult[];    // Tool execution results
}
```

**Storage Implementations:**

| Feature | Local (Dev) | Cosmos DB (Prod) |
|---------|-------------|------------------|
| **Location** | `backend/memory/` | Azure Cloud |
| **Format** | JSON files | NoSQL documents |
| **File Pattern** | `thread-{uuid}.json` | Partition: `/threadId` |
| **Performance** | Fast (local disk) | Fast (globally distributed) |
| **Scalability** | Single machine | Unlimited |
| **Cost** | Free | ~$5-25/month (serverless) |
| **Persistence** | Until deleted | Highly durable |
| **Best For** | Development, testing | Production, teams |

**Configuration:**

```bash
# Local Storage (Development)
MEMORY_STORAGE_TYPE=file

# Cosmos DB (Production)
MEMORY_STORAGE_TYPE=cosmos
COSMOS_ENDPOINT=https://xxx.documents.azure.com:443/
COSMOS_KEY=your-key
COSMOS_DATABASE_NAME=projectpal
COSMOS_CONTAINER_NAME=conversations
```

### RAG (Retrieval-Augmented Generation) Pipeline

**PM Handbook Search Architecture:**

```
User Question: "What's the budget approval process for $100k?"
       │
       ▼
1. Query Processing (rag-tool.ts)
   ├─→ Extract keywords: ["budget", "approval", "process", "100k"]
   ├─→ Clean and normalize
   │
   ▼
2. Document Retrieval (Blob Storage)
   ├─→ Fetch: pm-handbook/PM_handbook.txt
   ├─→ Cache for 5 minutes (in-memory)
   │
   ▼
3. Chunking Strategy
   ├─→ Split document by sections
   ├─→ Chunk size: ~500 characters
   ├─→ Overlap: 50 characters
   ├─→ Preserve context boundaries
   │
   ▼
4. Relevance Scoring
   ├─→ For each chunk:
   │   ├─→ Keyword frequency score
   │   ├─→ Position weighting (early = higher)
   │   ├─→ Proximity score (keywords close = higher)
   │   └─→ Calculate total score
   │
   ▼
5. Selection
   ├─→ Sort chunks by score
   ├─→ Select top 3 chunks
   ├─→ Total context: ~1500 characters
   │
   ▼
6. Context Injection
   ├─→ Build enhanced prompt:
   │   """
   │   Based on the following from the PM handbook:
   │   
   │   [Chunk 1: Budget policies section...]
   │   [Chunk 2: Approval process section...]
   │   [Chunk 3: Thresholds section...]
   │   
   │   Answer the user's question: {question}
   │   """
   │
   ▼
7. OpenAI Generation
   └─→ AI generates contextual answer citing handbook
       "According to the PM handbook, projects over $50k 
        require CFO approval, while projects over $100k 
        require both CFO and CEO approval..."
```

**RAG Features:**
- **Smart Chunking**: Preserves semantic context
- **Scoring Algorithm**: Multi-factor relevance ranking
- **Caching**: Reduces blob storage API calls
- **Error Handling**: Graceful fallback to general knowledge
- **Source Attribution**: Returns which sections were used

---

## Features

### AI Agent Capabilities

#### 1. Team Directory Tool

**Function**: `getTeamDirectory`

```typescript
// Find team members
Input: {
  role?: string;        // Optional role filter
}

Output: {
  members: [
    {
      name: string;
      role: string;
      availability: "available" | "busy" | "out";
      skills: string[];
      email: string;
    }
  ]
}

// Example Queries
"Who are the available data scientists?"
→ Returns: Sarah Chen, Alex Wong with their details

"Find frontend developers"
→ Returns: All frontend developers in team

"Show me the team"
→ Returns: All team members
```

#### 2. PM Handbook RAG Tool

**Function**: `queryHandbook`

```typescript
// Search PM handbook
Input: {
  query: string;
}

Output: {
  answer: string;          // AI-generated answer
  sources: string[];       // Handbook sections used
  confidence: number;      // 0-1 confidence score
  chunks: string[];        // Raw chunks found
}

// Example Queries
"What's the approval process for $100k projects?"
→ Returns: Policy details with handbook citations

"Budget guidelines for new projects"
→ Returns: Budget policies from handbook

"How do I submit a project proposal?"
→ Returns: Step-by-step process from handbook
```

#### 3. Project Ticket Creation Tool

**Function**: `createProjectTicket`

```typescript
// Create project ticket
Input: {
  title: string;
  description: string;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

Output: {
  ticketId: string;        // Generated ticket ID
  created: boolean;
  ticket: {
    id: string;
    title: string;
    description: string;
    assignee: string | null;
    priority: string;
    status: "open";
    createdAt: string;
  }
}

// Example Queries
"Create a kickoff ticket for the AI chatbot project"
→ Returns: Ticket #1234 created and assigned

"Create high priority ticket for API integration, assign to Sarah"
→ Returns: Ticket with specific assignment and priority
```

### API Endpoints

#### GET `/api/health`

Health check endpoint for monitoring.

```typescript
Request: GET /api/health

Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2025-10-25T12:00:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "used": "150 MB",
    "total": "512 MB"
  }
}
```

#### POST `/api/chat`

Streaming chat endpoint with Server-Sent Events.

```typescript
Request: POST /api/chat
Content-Type: application/json

{
  "message": "Who are available data scientists?",
  "threadId": "550e8400-e29b-41d4-a716-446655440000"  // Optional
}

Response: 200 OK
Content-Type: text/event-stream

// Event Stream
data: {"type":"connected","timestamp":"2025-10-25T12:00:00Z"}

data: {"type":"status","message":"Thinking..."}

data: {"type":"status","message":"Using tool: getTeamDirectory"}

data: {"type":"status","message":"Generating response..."}

data: {"type":"chunk","content":"We have two","timestamp":"2025-10-25T12:00:01Z"}

data: {"type":"chunk","content":" available data scientists:","timestamp":"2025-10-25T12:00:01Z"}

data: {"type":"chunk","content":" Sarah Chen and","timestamp":"2025-10-25T12:00:02Z"}

data: {"type":"chunk","content":" Alex Wong.","timestamp":"2025-10-25T12:00:02Z"}

data: {"type":"complete","response":"We have two available data scientists: Sarah Chen and Alex Wong.","toolCalls":[{"name":"getTeamDirectory","arguments":{"role":"data scientist"},"result":[...]}]}

data: {"type":"end"}
```

#### POST `/api/chat-simple`

Non-streaming chat endpoint for simple JSON responses.

```typescript
Request: POST /api/chat-simple
Content-Type: application/json

{
  "message": "Hi, how are you?",
  "threadId": "550e8400-e29b-41d4-a716-446655440000"
}

Response: 200 OK
Content-Type: application/json

{
  "response": "Hello! I'm doing well, thank you for asking. How can I help you with your project management needs today?",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "toolCalls": [],
  "timestamp": "2025-10-25T12:00:00Z"
}
```

### Streaming Configuration

```typescript
// SSE Event Types
interface SSEEvent {
  connected:  { type: "connected", timestamp: string };
  status:     { type: "status", message: string };
  chunk:      { type: "chunk", content: string, timestamp: string };
  complete:   { type: "complete", response: string, toolCalls: ToolCall[] };
  end:        { type: "end" };
  error:      { type: "error", message: string, code?: string };
}

// Timing Configuration
const STREAMING_CONFIG = {
  chunkSize: 10,           // Words per chunk
  chunkDelay: 50,          // Milliseconds between chunks
  statusDelay: 300,        // Milliseconds for status updates
  connectionTimeout: 30000, // 30 seconds
  keepAliveInterval: 15000, // 15 seconds
};
```

---

## Tech Stack

### Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **Astro** | Static site framework, component-based | 4.x |
| **TypeScript** | Type safety, enhanced DX | 5.x |
| **Vanilla JavaScript** | SSE client, DOM manipulation | ES2022 |
| **CSS3** | Styling, animations, grid/flexbox | Modern |
| **Marked.js** | Markdown to HTML parsing | 12.x |
| **Highlight.js** | Code syntax highlighting | 11.x |

### Backend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | JavaScript runtime environment | 20.9+ |
| **TypeScript** | Type safety, better maintainability | 5.x |
| **Express** | Web framework for API routes | 4.x |
| **Mastra Framework** | AI agent orchestration, tools, memory | Latest |
| **OpenAI SDK** | GPT-4o-mini API client | Latest |
| **Zod** | Runtime schema validation | 3.x |
| **@azure/cosmos** | Azure Cosmos DB client | Latest |
| **@azure/storage-blob** | Azure Blob Storage client | Latest |

### Infrastructure & DevOps

| Service/Tool | Purpose | Tier/Version |
|--------------|---------|--------------|
| **Azure Static Web Apps** | Frontend hosting (CDN, SSL) | Free/Standard |
| **Azure Container Apps** | Backend hosting (auto-scaling) | Consumption |
| **Azure Cosmos DB** | NoSQL database (conversation memory) | Serverless |
| **Azure Blob Storage** | Document storage (PM handbook) | Standard LRS |
| **Azure Container Registry** | Private Docker image registry | Basic |
| **Application Insights** | APM, logging, monitoring | Pay-as-you-go |
| **Log Analytics** | Centralized logging | Pay-as-you-go |
| **Terraform** | Infrastructure as Code (IaC) | 1.5+ |
| **GitHub Actions** | CI/CD automation | Free tier |
| **Docker** | Container runtime | 20.x+ |

---

## Local Development

### Prerequisites

- **Node.js** 20.9.0 or higher
- **npm** 9.x or higher
- **OpenAI API Key** - [Get from OpenAI Platform](https://platform.openai.com/api-keys)
- **Git** - For version control
- **(Optional)** Azure Cosmos DB account for production memory

### Quick Start

```powershell
# 1. Clone repository
git clone https://github.com/CodeSaurabhCode/ProjectPal.git
cd ProjectPal

# 2. Install backend dependencies
cd backend
npm install --legacy-peer-deps

# 3. Configure environment
cp .env.example .env
notepad .env
# Add: OPENAI_API_KEY=your_key_here
#      MEMORY_STORAGE_TYPE=file

# 4. Start backend server (new terminal)
npm run server:dev
# → Backend running at http://localhost:3001

# 5. Install frontend dependencies (new terminal)
cd frontend
npm install

# 6. Start frontend server
npm run dev
# → Frontend running at http://localhost:4321
```

### Environment Variables

**Backend (`backend/.env`):**

```bash
# Required
OPENAI_API_KEY=sk-...                    # Your OpenAI API key
MEMORY_STORAGE_TYPE=file                  # 'file' or 'cosmos'

# Optional (Cosmos DB - Production)
COSMOS_ENDPOINT=https://xxx.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE_NAME=projectpal
COSMOS_CONTAINER_NAME=conversations

# Optional (Server Config)
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:4321
ALLOWED_ORIGINS=http://localhost:4321,http://localhost:3000
```

**Frontend (`frontend/.env`):**

```bash
# Backend API URL
PUBLIC_BACKEND_URL=http://localhost:3001
```

### Development Scripts

**Backend:**

```powershell
cd backend

# Development (auto-reload with nodemon)
npm run server:dev

# Production mode
npm run server

# Lint code
npm run lint

# Type check
npm run type-check
```

**Frontend:**

```powershell
cd frontend

# Development server (auto-reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check
```

### Testing Locally

**1. Test Backend Health:**

```powershell
# Health check
curl http://localhost:3001/api/health

# Expected:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

**2. Test Chat (PowerShell):**

```powershell
# Simple chat
$body = @{
    message = "Hi, how are you?"
    threadId = "test-thread-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/chat-simple" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**3. Test Frontend:**

```powershell
# Open in browser
start http://localhost:4321

# Try these queries:
# - "Who are the available data scientists?"
# - "What's the budget approval process?"
# - "Create a kickoff ticket for my project"
```

---

## Project Structure

### Complete Directory Tree

```
ProjectPal/
├── .github/
│   ├── workflows/
│   │   ├── pr-validation.yml              # PR checks (lint, build)
│   │   ├── terraform-plan.yml             # Infrastructure preview
│   │   ├── terraform-apply.yml            # Infrastructure deployment
│   │   └── deploy-apps.yml                # Application deployment
│   └── CICD_SETUP.md                      # CI/CD setup guide
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── environment.ts             # Singleton config manager
│   │   ├── data/
│   │   │   └── teamData.ts                # Team member data
│   │   ├── services/
│   │   │   └── SSEService.ts              # Server-Sent Events service
│   │   ├── mastra/
│   │   │   ├── agents/
│   │   │   │   └── project-assistant.ts   # Main AI agent
│   │   │   ├── tools/
│   │   │   │   ├── directory.ts           # Team directory tool
│   │   │   │   ├── rag-tool.ts            # PM handbook RAG tool
│   │   │   │   └── ticket-tool.ts         # Ticket creation tool
│   │   │   └── index.ts                   # Mastra config
│   │   └── server.ts                      # Express server + routes
│   ├── docs/
│   │   └── PM_handbook.txt                # Knowledge base document
│   ├── memory/                            # Local memory storage (dev)
│   │   └── thread-*.json                  # Conversation threads
│   ├── .env.example                       # Environment template
│   ├── .env                               # Local environment (gitignored)
│   ├── package.json                       # Dependencies + scripts
│   ├── tsconfig.json                      # TypeScript config
│   ├── Dockerfile                         # Container image
│   └── MEMORY_SETUP.md                    # Memory setup guide
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── astro.svg
│   │   │   └── background.svg
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatHeader.astro       # Header component
│   │   │   │   ├── ChatMessages.astro     # Messages list
│   │   │   │   └── ChatInputArea.astro    # Input + suggestions
│   │   │   └── Sidebar.astro              # (Optional) sidebar
│   │   ├── layouts/
│   │   │   └── Layout.astro               # Base page layout
│   │   ├── pages/
│   │   │   └── index.astro                # Main chat page
│   │   ├── scripts/
│   │   │   └── chat.ts                    # Chat logic + SSE client
│   │   └── styles/
│   │       └── global.css                 # Global styles
│   ├── public/
│   │   └── favicon.svg                    # Site favicon
│   ├── astro.config.mjs                   # Astro configuration
│   ├── package.json                       # Dependencies + scripts
│   ├── tsconfig.json                      # TypeScript config
│   └── README.md                          # Frontend docs
│
├── terraform/
│   ├── modules/
│   │   ├── container-registry/            # ACR module
│   │   ├── container-apps/                # Container Apps module
│   │   ├── cosmos-db/                     # Cosmos DB module
│   │   ├── static-web-app/                # Static Web Apps module
│   │   ├── storage/                       # Blob Storage module
│   │   └── monitoring/                    # App Insights module
│   ├── main.tf                            # Root module
│   ├── variables.tf                       # Input variables
│   ├── outputs.tf                         # Output values
│   ├── providers.tf                       # Provider config
│   ├── terraform.tfvars.example           # Example variables
│   └── terraform.tfvars                   # Actual variables (gitignored)
│
├── scripts/
│   ├── init-terraform.ps1                 # Initialize Terraform
│   ├── deploy.ps1                         # Full deployment script
│   └── destroy.ps1                        # Cleanup script
│
├── .gitignore                             # Git ignore rules
├── README.md                              # This file
└── DEPLOYMENT.md                          # Deployment guide
```

### Key Files Explained

**Backend Files:**

- **`server.ts`**: Express application with API routes (`/api/chat`, `/api/health`)
- **`mastra/agents/project-assistant.ts`**: AI agent with tools, memory, and instructions
- **`mastra/tools/*.ts`**: Individual tool implementations (directory, RAG, tickets)
- **`services/SSEService.ts`**: Handles Server-Sent Events streaming logic
- **`config/environment.ts`**: Centralized environment variable management
- **`Dockerfile`**: Multi-stage build for production container image

**Frontend Files:**

- **`pages/index.astro`**: Main entry point, composes chat interface
- **`components/Chat/*.astro`**: Reusable UI components
- **`scripts/chat.ts`**: TypeScript class managing chat state and SSE connection
- **`astro.config.mjs`**: Build configuration, output settings

**Infrastructure Files:**

- **`terraform/main.tf`**: Orchestrates all Azure resources
- **`terraform/modules/*`**: Modular, reusable infrastructure components
- **`.github/workflows/*.yml`**: GitHub Actions CI/CD pipelines

---

## API Documentation

### Request/Response Examples

#### Chat with Tool Usage

**Request:**
```http
POST /api/chat HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "message": "Who are the available frontend developers?",
  "threadId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Stream:**
```
data: {"type":"connected","timestamp":"2025-10-25T12:00:00.000Z"}

data: {"type":"status","message":"Thinking..."}

data: {"type":"status","message":"Using tool: getTeamDirectory"}

data: {"type":"status","message":"Generating response..."}

data: {"type":"chunk","content":"We currently have","timestamp":"2025-10-25T12:00:01.100Z"}

data: {"type":"chunk","content":" two frontend developers","timestamp":"2025-10-25T12:00:01.150Z"}

data: {"type":"chunk","content":" available: Mike Johnson","timestamp":"2025-10-25T12:00:01.200Z"}

data: {"type":"chunk","content":" and Lisa Anderson.","timestamp":"2025-10-25T12:00:01.250Z"}

data: {"type":"complete","response":"We currently have two frontend developers available: Mike Johnson and Lisa Anderson.","toolCalls":[{"name":"getTeamDirectory","arguments":{"role":"frontend developer"},"result":[{"name":"Mike Johnson","role":"Frontend Developer","availability":"available","skills":["React","Vue","TypeScript"]},{"name":"Lisa Anderson","role":"Frontend Developer","availability":"available","skills":["Angular","CSS","UI/UX"]}]}]}

data: {"type":"end"}
```

#### RAG Query

**Request:**
```http
POST /api/chat HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "message": "What's the budget approval process for projects over $50k?",
  "threadId": "test-thread-456"
}
```

**Response** (includes handbook citations in tool results)

---

## Usage Examples

### Example Conversations

**1. Team Discovery:**
```
User: "Who are the available data scientists?"

AI: "We have two available data scientists:
    1. Sarah Chen - Skills: Python, ML, TensorFlow
    2. Alex Wong - Skills: R, Statistics, Deep Learning
    
    Would you like me to create a ticket and assign one of them?"
```

**2. Policy Query:**
```
User: "What's the approval process for a $100k project?"

AI: "According to the PM handbook, projects over $50k require:
    
    1. Initial proposal submission
    2. CFO review and approval
    3. For projects over $100k (like yours):
       - Additional CEO approval required
       - Board notification
       - Quarterly review checkpoints
    
    Would you like me to help you draft the proposal?"
```

**3. Ticket Creation:**
```
User: "Create a kickoff ticket for the AI chatbot integration project, assign to Sarah"

AI: "✅ Ticket created successfully!
    
    Ticket #1234: AI Chatbot Integration - Kickoff
    Assigned to: Sarah Chen
    Priority: Medium
    Status: Open
    
    Description: Initial kickoff meeting for AI chatbot integration project.
    Next steps: Schedule meeting and gather requirements.
    
    The ticket has been created and Sarah has been notified."
```

**4. Natural Conversation:**
```
User: "Hi, I'm starting a new project"

AI: "Hello! I'd be happy to help you with your new project. 
    To get started, could you tell me:
    
    1. What type of project is it?
    2. What's the estimated budget?
    3. What team members or skills do you need?
    
    I can help you find available team members, understand 
    the approval process, and create initial project tickets."
```

---

## Deployment

ProjectPal includes complete infrastructure automation for deploying to Azure Cloud.

### Quick Deploy to Azure

```powershell
# Prerequisites: Azure CLI, Terraform, Docker

# 1. Login to Azure
az login

# 2. Initialize Terraform
.\scripts\init-terraform.ps1

# 3. Configure
notepad terraform\terraform.tfvars
# Add: openai_api_key, subscription_id

# 4. Deploy everything
.\scripts\deploy.ps1

# Done! Your app is live in ~5-10 minutes
```

### What Gets Deployed

- ✅ **Frontend**: Azure Static Web Apps (FREE tier, global CDN, auto-SSL)
- ✅ **Backend**: Azure Container Apps (auto-scaling, 0.5 vCPU, 1GB RAM)
- ✅ **Database**: Azure Cosmos DB (serverless, globally distributed)
- ✅ **Storage**: Azure Blob Storage (PM handbook documents)
- ✅ **Registry**: Azure Container Registry (private Docker images)
- ✅ **Monitoring**: Application Insights + Log Analytics

**Estimated Cost:** $20-45/month (development) | $80-135/month (production)

### CI/CD Automation

Four automated GitHub Actions workflows:

1. **PR Validation** - Lint and build checks on pull requests
2. **Terraform Plan** - Preview infrastructure changes on PRs
3. **Terraform Apply** - Deploy infrastructure on merge to main
4. **Deploy Apps** - Build and deploy applications on merge to main

**Setup CI/CD:**
1. Create Azure service principal
2. Add 7 GitHub secrets (Azure credentials, OpenAI key, deployment tokens)
3. Push to `main` → automatic deployment! 🚀

### Documentation

- 📖 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
  - Step-by-step Azure setup
  - Terraform configuration
  - Troubleshooting
  - Cost breakdown

- 📖 **[.github/CICD_SETUP.md](.github/CICD_SETUP.md)** - CI/CD configuration
  - GitHub Actions setup
  - Secrets configuration
  - Workflow explanations

- 📖 **[backend/MEMORY_SETUP.md](backend/MEMORY_SETUP.md)** - Memory storage
  - Cosmos DB setup
  - Local vs production storage
  - Configuration options

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

- **Issues**: [GitHub Issues](https://github.com/CodeSaurabhCode/ProjectPal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CodeSaurabhCode/ProjectPal/discussions)

---

**Built with ❤️ using Astro, Mastra, and Azure**
