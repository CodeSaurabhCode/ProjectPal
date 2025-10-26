# ProjectPal - AI Project Management Assistant

[![PR Validation](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/pr-validation.yml)
[![Deploy Applications](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/deploy-apps.yml/badge.svg)](https://github.com/CodeSaurabhCode/ProjectPal/actions/workflows/deploy-apps.yml)

A complete full-stack AI-powered project management assistant with conversation memory, RAG capabilities, real-time streaming, and automated Azure deployment.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Local Development](#local-development)
6. [Project Structure](#project-structure)
7. [API Documentation](#api-documentation)
8. [Usage Examples](#usage-examples)
9. [Deployment](#deployment)

---

## Overview

ProjectPal is an intelligent project management assistant that helps teams with:
- **Team Management** - Find available team members by role
- **Policy Queries** - Search PM handbook using RAG (Retrieval-Augmented Generation)
- **Ticket Creation** - Create and assign project tickets
- **Natural Conversation** - Chat naturally with AI that maintains context

Built with modern technologies and production-ready infrastructure, featuring real-time streaming responses, persistent conversation memory, and full CI/CD automation.

---

## 🚀 Local Development

### Prerequisites
- Node.js 20.9.0+
- OpenAI API key

### Quick Start

1. **Clone and install dependencies:**
   ```powershell
   # Backend
   cd backend
   npm install --legacy-peer-deps
   
   # Frontend (in new terminal)
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```powershell
   # Backend: Copy and edit .env
   cd backend
   cp .env.example .env
   notepad .env
   
   # Minimum required:
   # OPENAI_API_KEY=your_key_here
   # MEMORY_STORAGE_TYPE=file
   ```

3. **Run locally:**
   ```powershell
   # Backend (http://localhost:3001)
   cd backend
   npm run server:dev
   
   # Frontend (http://localhost:4321) - in new terminal
   cd frontend
   npm run dev
   ```

### Project Structure

```
ProjectPal/
├── backend/                          # Node.js + Mastra AI agent
│   ├── src/
│   │   ├── mastra/
│   │   │   ├── agents/              # AI agent configuration
│   │   │   ├── tools/               # RAG, directory, tickets
│   │   │   └── index.ts
│   │   ├── services/                # SSE, memory
│   │   └── server.ts                # Express API
│   ├── docs/PM_handbook.txt         # RAG knowledge base
│   └── .env
├── frontend/                         # Astro chat interface
│   ├── src/
│   │   ├── components/Chat/         # Chat UI components
│   │   ├── scripts/chat.ts          # SSE streaming logic
│   │   └── pages/index.astro
│   └── astro.config.mjs
└── terraform/                        # Infrastructure as Code
```

### Key Features

**Backend:**
- Streaming chat API with Server-Sent Events
- Conversation memory (local files or Azure Cosmos DB)
- RAG for PM handbook queries
- Team directory and ticket creation tools
- Health check endpoint at `/api/health`

**Frontend:**
- Real-time streaming chat interface
- Markdown rendering with syntax highlighting
- Responsive design (mobile + desktop)
- Status indicators for AI thinking/tool usage

**Development:**
- Hot-reload for both backend and frontend
- Local JSON file storage for conversation memory
- CORS configured for localhost

---

## ☁️ Deployment

### Azure Deployment with Terraform

**Infrastructure:**
- Azure Static Web Apps (frontend) - FREE tier
- Azure Container Apps (backend) - auto-scaling
- Azure Cosmos DB (memory) - serverless
- Azure Container Registry
- Application Insights

**Cost:** ~$20-45/month (dev) | ~$80-135/month (prod)

### Quick Deploy (5 minutes)

```powershell
# 1. Login to Azure
az login

# 2. Initialize Terraform
.\scripts\init-terraform.ps1

# 3. Configure settings
notepad terraform\terraform.tfvars
# Add: openai_api_key, project_name, environment

# 4. Deploy
.\scripts\deploy.ps1
```

Your app will be live at:
- Frontend: `https://<app-name>.azurestaticapps.net`
- Backend: `https://<app-name>-backend.azurewebsites.net`

### CI/CD with GitHub Actions

**Automated workflows:**
1. **`pr-validation.yml`** - Lint and build on PRs
2. **`terraform-plan.yml`** - Preview infrastructure changes
3. **`terraform-apply.yml`** - Deploy infrastructure on merge to main
4. **`deploy-apps.yml`** - Deploy applications on merge to main

**Setup:**
```powershell
# 1. Create Azure service principal
az ad sp create-for-rbac --name "github-actions-projectpal" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>

# 2. Add GitHub Secrets (Settings → Secrets → Actions)
AZURE_CLIENT_ID=<from-step-1>
AZURE_CLIENT_SECRET=<from-step-1>
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_TENANT_ID=<from-step-1>
OPENAI_API_KEY=<your-openai-key>
AZURE_STATIC_WEB_APPS_API_TOKEN=<from-static-web-app>
ACR_USERNAME=<from-container-registry>
ACR_PASSWORD=<from-container-registry>

# 3. Push to main → automatic deployment! 🚀
```

📖 **Detailed guides:**
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment instructions
- [.github/CICD_SETUP.md](.github/CICD_SETUP.md) - CI/CD setup guide
- [backend/MEMORY_SETUP.md](backend/MEMORY_SETUP.md) - Cosmos DB memory setup

### Terraform State

Remote state stored in Azure Blob Storage:
- Resource Group: `terraform-state-rg`
- Storage Account: `tfstateprojectpal123`
- Container: `tfstate`
- State File: `projectpal.tfstate`

Configuration in `terraform/main.tf`:
```hcl
backend "azurerm" {
  resource_group_name  = "terraform-state-rg"
  storage_account_name = "tfstateprojectpal123"
  container_name       = "tfstate"
  key                  = "projectpal.tfstate"
}
```

---

**Need help?** Check the detailed documentation linked above or raise an issue.