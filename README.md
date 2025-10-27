# ProjectPal - AI Project Management Assistant

[![PR Validation](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/pr-validation.yml)
[![Deploy Applications](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/deploy-apps.yml/badge.svg)](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/deploy-apps.yml)

AI-powered project management assistant with real-time streaming, RAG capabilities, and Azure serverless infrastructure.

**Key Features:**
- 🤖 Real-time streaming responses (SSE)
- 💾 Conversation memory (thread-based)
- 📚 RAG with Cosmos DB vector search
- 🚀 Auto-scaling serverless (Azure)
- 💰 Cost-optimized ($26-41/month)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.9+
- OpenAI API key ([Get here](https://platform.openai.com/api-keys))

### Run Locally (5 minutes)

```powershell
# 1. Clone repository
git clone https://github.com/CodeSaurabhCode/ProjectPal.git
cd ProjectPal

# 2. Setup backend
cd backend
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env: Add OPENAI_API_KEY=sk-...
npm run server:dev    # → http://localhost:3001

# 3. Setup frontend (new terminal)
cd frontend
npm install
npm run dev           # → http://localhost:4321

# 4. Open browser → http://localhost:4321
```

### Environment Variables

**Backend `.env`:**
```bash
OPENAI_API_KEY=sk-...              # Required
MEMORY_STORAGE_TYPE=file           # 'file' (dev) or 'cosmos' (prod)
PORT=3001
FRONTEND_URL=http://localhost:4321
```

**Frontend `.env`:**
```bash
PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## 📋 What It Does

**Team Management:**
- "Who are the available data scientists?"
- "Find frontend developers"

**Policy Queries (RAG):**
- "What's the budget approval process for $100k?"
- "How do I submit a project proposal?"

**Ticket Creation:**
- "Create a kickoff ticket for AI chatbot project"
- "Create high priority ticket, assign to Sarah"

---

## 🏗️ Architecture

**Tech Stack:**
- Frontend: Astro + TypeScript (Azure Static Web Apps)
- Backend: Node.js + Express + Mastra (Container Apps)
- AI: OpenAI GPT-4o-mini + text-embedding-3-small
- Data: Cosmos DB (vector search) + Blob Storage
- Infrastructure: Terraform + GitHub Actions

**How It Works:**
1. User sends message → Frontend (Astro SSE client)
2. Backend validates → Mastra Agent analyzes intent
3. Agent executes tools if needed (RAG search, team lookup)
4. OpenAI GPT-4o-mini generates response
5. SSE streams response word-by-word to frontend
6. Conversation saved to memory (Cosmos DB or local files)

**Streaming:**
- Protocol: Server-Sent Events (SSE)
- TTFC: 300-800ms
- Events: `connected`, `status`, `chunk`, `tool`, `complete`, `end`
- See [STREAMING_IMPLEMENTATION.md](docs/STREAMING_IMPLEMENTATION.md)

**RAG Pipeline:**
- Cosmos DB native vector search (quantizedFlat, 1536 dims, cosine)
- Vector search: <20ms latency
- Cost: $0-2/month (vs $40+ alternatives)
- See [EMBEDDINGS_ARCHITECTURE.md](docs/EMBEDDINGS_ARCHITECTURE.md)

---

## 🛠️ AI Tools

**1. Team Directory** - Find team members by role, availability, skills  
**2. PM Handbook RAG** - Search PM handbook using vector embeddings  
**3. Ticket Creation** - Create and assign project tickets

---

## 📚 API Endpoints

### `POST /api/chat` (SSE Streaming)
Real-time streaming with Server-Sent Events.

**Events:** `connected`, `status`, `chunk`, `tool`, `complete`, `error`, `end`

### `POST /api/chat-simple` (JSON)
Non-streaming endpoint for simple responses.

### `GET /api/health`
Health check endpoint.

---

## 🏛️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph User["👤 User Layer"]
        U[Project Manager<br/>Web Browser]
    end
    
    subgraph Frontend["🌐 Azure Frontend - FREE"]
        SWA[Static Web Apps<br/>Astro + SSE Client]
    end
    
    subgraph Backend["⚙️ Azure Backend"]
        CA[Container Apps<br/>Express + Mastra<br/>Auto-scale 1-10]
        ACR[Container Registry<br/>Docker Images]
    end
    
    subgraph AI["🤖 OpenAI"]
        GPT[GPT-4o-mini<br/>Streaming Chat]
        EMB[text-embedding-3-small<br/>1536 dims]
    end
    
    subgraph Data["💾 Azure Data"]
        CONV[Cosmos: Conversations<br/>/threadId partition]
        VECT[Cosmos: Embeddings<br/>Vector indexed]
        BLOB[Blob Storage<br/>Documents]
    end
    
    subgraph Ops["📊 Observability"]
        INSIGHTS[Application Insights<br/>Monitoring]
    end
    
    U -->|HTTPS| SWA
    SWA -->|SSE| CA
    CA -->|Stream| GPT
    CA -->|Embed| EMB
    CA -->|Store| CONV
    CA -->|Search| VECT
    CA -->|Fetch| BLOB
    CA -->|Logs| INSIGHTS
    ACR -.->|Image| CA
    
    classDef userStyle fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    classDef azureStyle fill:#0078d4,stroke:#004578,stroke-width:2px,color:#fff
    classDef aiStyle fill:#10a37f,stroke:#0d8c6a,stroke-width:2px,color:#fff
    classDef dataStyle fill:#ffd93d,stroke:#c7a600,stroke-width:2px,color:#000
    classDef opsStyle fill:#9c27b0,stroke:#6a0080,stroke-width:2px,color:#fff
    
    class U userStyle
    class SWA,CA,ACR azureStyle
    class GPT,EMB aiStyle
    class CONV,VECT,BLOB dataStyle
    class INSIGHTS opsStyle
```

### Chat Session Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as Frontend<br/>SSE
    participant BE as Backend<br/>Mastra
    participant MEM as Cosmos<br/>Memory
    participant RAG as RAG Tool
    participant EMB as OpenAI<br/>Embed
    participant VEC as Cosmos<br/>Vector
    participant GPT as OpenAI<br/>GPT-4o-mini
    
    U->>FE: "What's budget approval for $100k?"
    FE->>BE: POST /api/chat
    
    BE->>MEM: Load history
    MEM-->>BE: Thread context
    
    BE->>FE: event: connected
    BE->>FE: event: status "Analyzing..."
    
    BE->>RAG: queryHandbookSmart
    RAG->>EMB: Generate embedding
    EMB-->>RAG: 1536-dim vector
    
    RAG->>VEC: VectorDistance search
    Note over VEC: <20ms latency
    VEC-->>RAG: Top 5 chunks
    
    RAG-->>BE: Context retrieved
    
    BE->>FE: event: status "Generating..."
    BE->>GPT: Stream chat completion
    
    loop Stream chunks
        GPT-->>BE: Text chunk
        BE->>FE: event: chunk
        Note over FE: Render progressively
    end
    
    GPT-->>BE: Stream done
    
    BE->>FE: event: tool
    BE->>MEM: Save message
    BE->>FE: event: complete
    BE->>FE: event: end
    
    FE-->>U: Display response
```

---

## 📁 Project Structure

```
ProjectPal/
├── backend/
│   ├── src/
│   │   ├── mastra/               # AI agent + tools
│   │   ├── routes/chat.ts        # SSE streaming endpoint
│   │   └── server.ts             # Express app
│   ├── memory/                   # Conversation storage
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/Chat/      # UI components
│   │   ├── scripts/chat.ts       # SSE client
│   │   └── pages/index.astro     # Main page
│   └── astro.config.mjs
│
├── terraform/                    # Infrastructure as Code
├── .github/workflows/            # CI/CD pipelines
└── docs/                         # Documentation
```

---

## 🚢 Deployment

### Deploy to Azure (10 minutes)

```powershell
# 1. Login to Azure
az login

# 2. Initialize & configure
cd terraform
terraform init
cp terraform.tfvars.example terraform.tfvars
# Edit: Add openai_api_key, subscription_id

# 3. Deploy
terraform apply
```

**What Gets Deployed:**
- Static Web Apps (Frontend) - FREE
- Container Apps (Backend) - Auto-scaling
- Cosmos DB - Vector search
- Blob Storage - Documents
- Container Registry - Docker images
- Application Insights - Monitoring
**Cost:** $26-41/month (20-45% under $50 budget)

### CI/CD
GitHub Actions automatically deploys on push to `main`. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup.

---
---

## 📖 Documentation

**Technical Guides:**
- [STREAMING_IMPLEMENTATION.md](docs/STREAMING_IMPLEMENTATION.md) - SSE streaming with Mastra
- [EMBEDDINGS_ARCHITECTURE.md](docs/EMBEDDINGS_ARCHITECTURE.md) - Cosmos DB vector search
- [ARCHITECTURE_DIAGRAMS.md](docs/ARCHITECTURE_DIAGRAMS.md) - Visual architecture (12 diagrams)

**Submission Documents:**
- [01_Executive_Summary.md](docs/submission/01_Executive_Summary.md)
- [02_Conceptual_Design.md](docs/submission/02_Conceptual_Design.md)
- [03_Azure_Architecture.md](docs/submission/03_Azure_Architecture.md)
- [04_Service_Rationale.md](docs/submission/04_Service_Rationale.md)

**Setup:**
- [DEPLOYMENT.md](DEPLOYMENT.md) - Azure deployment guide
- [backend/MEMORY_SETUP.md](backend/MEMORY_SETUP.md) - Memory configuration
- [.github/CICD_SETUP.md](.github/CICD_SETUP.md) - CI/CD setup

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push and open PR

---

## 📄 License

MIT License

---

**Built with ❤️ using Astro, Mastra, and Azure**AI key, deployment tokens)
3. Push to `main` → automatic deployment! 🚀



- **Issues**: [GitHub Issues](https://github.com/CodeSaurabhCode/ProjectPal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CodeSaurabhCode/ProjectPal/discussions)

---

**Built with ❤️ using Astro, Mastra, and Azure**
