# ProjectPal - Full Stack AI Agent Development

A complete full-stack application featuring an AI-powered project management assistant built with Mastra framework and Astro frontend.

## 🏗️ Architecture

- **Backend**: Node.js + TypeScript + Express + Mastra Framework
- **Frontend**: Astro + TypeScript
- **AI**: OpenAI GPT-4o-mini with function calling
- **Tools**: RAG for handbook queries, team directory, ticket creation
- **Architecture**: Modular with separated services, configuration, and data layers

## 🚀 Features

### Backend (Mastra-powered AI Agent)
- ✅ Express server with TypeScript
- ✅ `/api/chat` - Streaming chat endpoint with Server-Sent Events
- ✅ `/api/health` - Health check endpoint
- ✅ Mastra Agent orchestration
- ✅ RAG capabilities for PM_Handbook.txt with error handling
- ✅ SSE Service - Centralized Server-Sent Events handling
- ✅ Environment Configuration - Singleton pattern for config management
- ✅ Tool integration:
  - `getTeamDirectory` - Find available team members
  - `createProjectTicket` - Create project tickets
  - `queryHandbook` - Search PM handbook for policies
- ✅ Type-safe request validation with Zod
- ✅ Enhanced error logging and debugging
- ✅ CORS configuration for frontend

### Frontend (Astro)
- ✅ Modern chat interface with streaming support
- ✅ Centered welcome screen that transitions to chat layout
- ✅ Real-time Server-Sent Events handling
- ✅ Responsive design for mobile and desktop
- ✅ Connection status indicators
- ✅ Typing indicators and word-by-word message streaming
- ✅ Error handling and retry logic
- ✅ Clean UI without dev toolbar
- ✅ Markdown rendering with code syntax highlighting

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 20.9.0 or higher
- OpenAI API key

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your OpenAI API key
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the backend server:**
   ```bash
   # Development mode with auto-reload
   npm run server:dev
   
   # Or production mode
   npm run server
   ```

   The backend will be available at `http://localhost:3001`

### Frontend Setup

1. **Open a new terminal and navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:4321`


## 📁 Project Structure

```
ProjectPal/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── environment.ts           # Environment configuration
│   │   ├── data/
│   │   │   └── teamData.ts             # Team directory data
│   │   ├── services/
│   │   │   └── SSEService.ts           # Server-Sent Events service
│   │   ├── mastra/
│   │   │   ├── agents/
│   │   │   │   └── project-assistant.ts # Main AI agent
│   │   │   ├── tools/
│   │   │   │   ├── directory.ts        # Team directory tool
│   │   │   │   └── rag-tool.ts        # RAG handbook tool
│   │   │   └── index.ts               # Mastra configuration
│   │   └── server.ts                  # Express server
│   ├── docs/
│   │   └── PM_handbook.txt            # Knowledge base
│   ├── .env                           # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatHeader.astro
│   │   │   │   ├── ChatMessages.astro
│   │   │   │   └── ChatInputArea.astro
│   │   │   └── Sidebar.astro
│   │   ├── scripts/
│   │   │   └── chat.ts                # Chat logic
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── layouts/
│   │   │   └── Layout.astro
│   │   └── pages/
│   │       └── index.astro            # Main chat interface
│   ├── astro.config.mjs              # Astro configuration
│   └── package.json
└── README.md
```

## 🔧 Key Features Implemented

### Backend Architecture
- **SSE Service**: Centralized Server-Sent Events handling with methods for different event types
- **Environment Config**: Singleton pattern for managing environment variables and app configuration
- **Data Segregation**: Separated business logic from static data (team directory)
- **Enhanced Error Handling**: Comprehensive logging and error tracking for RAG tool
- **Modular Structure**: Clean separation of concerns (config, data, services, agents, tools)

### Request/Response Format
```typescript
// Request
{
  "message": "Hi, I'm Saurabh, how are you"
}

// Streaming Response (Server-Sent Events)
data: {"type": "connected", "timestamp": "..."}
data: {"type": "status", "message": "Thinking..."}
data: {"type": "status", "message": "Using tool: query-handbook"}
data: {"type": "status", "message": "Generating response..."}
data: {"type": "chunk", "content": "Hello", "timestamp": "..."}
data: {"type": "chunk", "content": " Saurabh", "timestamp": "..."}
data: {"type": "complete", "response": "Full response", "toolCalls": [...]}
data: {"type": "end"}
```

### Streaming Configuration
- **Chunk Size**: 10 words per chunk
- **Chunk Delay**: 50ms between chunks
- **Tool Status Delay**: 300ms for status updates
- **Word-by-Word Streaming**: Smooth, natural response display

### Tool Functions
- **Team Directory**: Find available team members by role
- **Ticket Creation**: Create project tickets with assignments
- **Handbook RAG**: Query PM handbook for policies and procedures with enhanced error handling

### AI Agent Capabilities
- Natural language understanding
- Function calling with multiple tools
- Context-aware responses
- Project management expertise
- Real-time streaming responses

### Frontend Features
- **Welcome Screen**: Clean centered layout on initial load
- **Dynamic Layout**: Transitions from centered to chat layout when conversation starts
- **SSE Streaming**: Word-by-word display of AI responses
- **Status Indicators**: Shows AI thinking, tool usage, and response generation
- **Responsive Design**: Works on desktop and mobile
- **Clean Interface**: No dev toolbar or distracting elements

## 🎯 Usage Examples

The AI assistant can handle various project management tasks:

1. **Team Management**: "Who are the available data scientists?"
2. **Policy Queries**: "What's the approval process for projects over $50k?"
3. **Ticket Creation**: "Create a kick-off ticket for the AI chatbot project"
4. **General Chat**: "Hi, how can you help me with my project?"

## 🚦 Status

- ✅ Backend: Complete with modular architecture
- ✅ Frontend: Complete with centered welcome screen and streaming
- ✅ Integration: Full-stack working with SSE streaming
- ✅ AI Agent: Functional with tools and RAG
- ✅ Documentation: Complete setup guide and architecture docs
- ✅ Error Handling: Enhanced logging and debugging
- ✅ UI/UX: Clean, responsive, and user-friendly

## 📝 Recent Improvements

### Backend
- Extracted SSE Service for centralized event streaming
- Implemented Environment Configuration singleton
- Segregated team data from business logic
- Enhanced RAG tool with comprehensive error handling and logging
- Fixed SSE streaming timing (status before AI generation, word-by-word after)

### Frontend
- Added centered welcome screen for initial state
- Dynamic layout transition from welcome to chat mode
- Removed Astro dev toolbar for cleaner UI
- Improved responsive design
- Enhanced streaming visualization with status indicators

## 🔗 API Endpoints

- `GET /api/health` - Health check
- `POST /api/chat` - Streaming chat with Server-Sent Events
- `POST /api/chat-simple` - Simple JSON response chat

## 🛠️ Development

Both frontend and backend support hot-reloading during development:

```bash
# Backend with auto-reload
npm run server:dev

# Frontend with auto-reload  
npm run dev
```

The application is ready for development and testing!