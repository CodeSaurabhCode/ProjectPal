# ProjectPal Cloud Deployment Guide

## Overview
This guide will deploy the complete ProjectPal solution to Azure with:
- ✅ Advanced RAG with consolidated document management
- ✅ Cosmos DB vector storage with embeddings container
- ✅ Document tracking and chunk management
- ✅ Azure Container Apps for backend API
- ✅ Azure Static Web Apps for frontend
- ✅ Application Insights for monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Azure Cloud                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Azure Static Web Apps - FREE)                    │
│  └─ Astro application with chat interface                   │
│                                                              │
│  Backend (Azure Container Apps - Serverless)                │
│  ├─ Express API                                             │
│  ├─ RAG Service (consolidated pm-handbook)                  │
│  ├─ Document Tracking Service                               │
│  ├─ Vector Store (Cosmos DB)                                │
│  └─ Mastra AI Integration                                   │
│                                                              │
│  Cosmos DB (Serverless)                                     │
│  ├─ Database: ProjectPal                                    │
│  ├─ Container: conversations (chat history)                 │
│  └─ Container: embeddings (vector storage)                  │
│      ├─ Partition: /metadata/source = "pm-handbook"        │
│      ├─ Vector Index: 1536 dimensions, cosine similarity    │
│      └─ All document chunks in single partition             │
│                                                              │
│  Azure Blob Storage                                         │
│  └─ Uploaded documents storage                              │
│                                                              │
│  Container Registry (ACR)                                   │
│  └─ Docker images for backend                               │
│                                                              │
│  Monitoring                                                 │
│  ├─ Application Insights                                    │
│  └─ Log Analytics                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Azure CLI
```powershell
# Already logged in - verify subscription
az account show

# Expected subscription: Azure subscription 1 (cc96d8d4-2360-4a91-9524-924881c41550)
```

### 2. Environment Variables
Create `.env` file in backend directory:

```bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Storage Configuration
STORAGE_TYPE=cosmos

# These will be populated after Terraform deployment:
COSMOS_CONNECTION_STRING=<from terraform output>
COSMOS_DATABASE_NAME=ProjectPal
COSMOS_CONTAINER_NAME=conversations

# Application Settings
NODE_ENV=production
PORT=3000
```

### 3. Terraform Variables
Create `terraform/terraform.tfvars`:

```hcl
# Project Configuration
project_name = "projectpal"
environment  = "prod"
location     = "eastus"

# OpenAI API Key (REQUIRED)
openai_api_key = "your_openai_api_key_here"
openai_model   = "gpt-4o"

# Cosmos DB Configuration
cosmos_database_name  = "ProjectPal"
cosmos_container_name = "conversations"

# Storage Configuration
storage_container_name = "documents"

# Backend Configuration
backend_image        = "backend:latest"
backend_cpu          = "0.25"
backend_memory       = "0.5Gi"
backend_min_replicas = 0
backend_max_replicas = 3

# Static Web App Configuration
static_web_app_sku      = "Free"
static_web_app_location = "eastus2"

# Container Registry
acr_sku = "Basic"

# Tags
tags = {
  Project     = "ProjectPal"
  Environment = "Production"
  ManagedBy   = "Terraform"
  Feature     = "AdvancedRAG"
}
```

## Deployment Steps

### Step 1: Fix Terraform and Initialize

```powershell
# Navigate to ProjectPal root
cd D:\ProjectPal

# Run initialization script (now fixed)
.\scripts\init-terraform.ps1
```

**Expected Output:**
```
✅ Terraform initialized successfully
✅ Backend state configured
✅ Modules loaded
```

### Step 2: Build Backend Docker Image

```powershell
# Navigate to backend
cd backend

# Build Docker image
docker build -t projectpal-backend:latest .

# Test locally (optional)
docker run -p 3000:3000 --env-file .env projectpal-backend:latest
```

### Step 3: Deploy Infrastructure with Terraform

```powershell
# Navigate to terraform directory
cd ..\terraform

# Review deployment plan
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

**This creates:**
- ✅ Resource Group
- ✅ Cosmos DB with embeddings container
- ✅ Container Registry (ACR)
- ✅ Blob Storage
- ✅ Container Apps Environment
- ✅ Application Insights
- ✅ Static Web App

### Step 4: Push Backend Image to ACR

```powershell
# Get ACR login server from Terraform outputs
$ACR_NAME = terraform output -raw container_registry_name
$ACR_LOGIN = terraform output -raw container_registry_login_server

# Login to ACR
az acr login --name $ACR_NAME

# Tag image
docker tag projectpal-backend:latest ${ACR_LOGIN}/backend:latest

# Push to ACR
docker push ${ACR_LOGIN}/backend:latest
```

### Step 5: Update Container App with Image

```powershell
# Get container app name
$APP_NAME = terraform output -raw backend_container_app_name
$RG_NAME = terraform output -raw resource_group_name

# Update container app
az containerapp update `
  --name $APP_NAME `
  --resource-group $RG_NAME `
  --image "${ACR_LOGIN}/backend:latest"
```

### Step 6: Initialize Embeddings (PM Handbook)

```powershell
# Get Cosmos connection string
$COSMOS_CONN = terraform output -raw cosmos_connection_string

# Set environment variable
$env:COSMOS_CONNECTION_STRING = $COSMOS_CONN
$env:STORAGE_TYPE = "cosmos"

# Navigate to backend
cd ..\backend

# Run initialization script
npm run init-embeddings
```

**Expected Output:**
```
[DocumentTracking] Created new tracking file
[RAGService] Initializing...
[MastraVectorStore] Initializing Cosmos DB...
[MastraVectorStore] ✅ Cosmos DB container initialized
[RAGService] Processing PM_handbook.txt...
✅ Processed 1 documents, 47 chunks, 47 embeddings
[DocumentTracking] Added document: pm-handbook-initial (47 chunks)
✅ Vector storage initialized successfully
```

### Step 7: Deploy Frontend to Static Web App

```powershell
# Get backend URL
$BACKEND_URL = terraform output -raw backend_url

# Navigate to frontend
cd ..\frontend

# Update environment configuration
@"
PUBLIC_API_URL=$BACKEND_URL
"@ | Out-File -FilePath .env.production

# Build frontend
npm run build

# Get Static Web App deployment token
cd ..\terraform
$SWA_TOKEN = terraform output -raw static_web_app_deployment_token

# Deploy using SWA CLI
cd ..\frontend
npx @azure/static-web-apps-cli deploy `
  --deployment-token $SWA_TOKEN `
  --app-location "." `
  --output-location "dist"
```

### Step 8: Verify Deployment

```powershell
# Get all URLs
cd ..\terraform
terraform output

# Test backend health
$BACKEND_URL = terraform output -raw backend_url
curl "$BACKEND_URL/health"

# Test frontend
$FRONTEND_URL = terraform output -raw frontend_url
Start-Process $FRONTEND_URL
```

## Post-Deployment Configuration

### 1. Upload Additional Documents

Use the deployed frontend to upload documents:

1. Navigate to frontend URL
2. Click "Upload Document"
3. Select PDF, TXT, or MD files
4. Documents are processed and added to `pm-handbook` index in Cosmos DB

**Behind the scenes:**
```
1. File uploaded to Azure Blob Storage
2. Text extracted and chunked
3. Embeddings generated (OpenAI)
4. Chunks stored in Cosmos DB (partition: pm-handbook)
5. Document tracked in document-tracking.json
6. All documents searchable in single index
```

### 2. Monitor Application

Access Application Insights:

```powershell
# Get monitoring URLs
terraform output application_insights_name
terraform output log_analytics_workspace_name

# Open in Azure Portal
az monitor app-insights component show `
  --app $(terraform output -raw application_insights_name) `
  --resource-group $(terraform output -raw resource_group_name) `
  --query 'appId' -o tsv
```

### 3. View Cosmos DB Data

```powershell
# Open Cosmos DB in portal
az cosmosdb show `
  --name $(terraform output -raw cosmos_account_name) `
  --resource-group $(terraform output -raw resource_group_name)

# View embeddings container
# Portal → Cosmos DB → Data Explorer → ProjectPal → embeddings
```

**Expected structure:**
```json
{
  "id": "doc1-chunk-0",
  "embedding": [0.123, ...],
  "metadata": {
    "source": "pm-handbook",
    "documentId": "doc1",
    "chunkIndex": 0
  }
}
```

## Cost Estimates (Monthly)

Based on expected usage:

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| Static Web Apps | Free | $0 |
| Container Apps | Serverless (0 replicas idle) | $0-5 |
| Cosmos DB | Serverless (10K RU/month) | $0.50-2 |
| Blob Storage | LRS (1 GB) | $0.02 |
| Container Registry | Basic | $5 |
| Application Insights | 5GB free | $0 |
| **Total** | | **~$5-12/month** |

## Troubleshooting

### Terraform Errors

**Error: Backend state not found**
```powershell
# Initialize backend state
.\scripts\init-terraform.ps1
```

**Error: Resource already exists**
```powershell
# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/cc96d8d4-.../resourceGroups/projectpal-prod-rg
```

### Container App Errors

**Error: Image pull failed**
```powershell
# Verify ACR connection
az acr repository list --name $(terraform output -raw container_registry_name)

# Check container app logs
az containerapp logs show `
  --name $(terraform output -raw backend_container_app_name) `
  --resource-group $(terraform output -raw resource_group_name) `
  --follow
```

### Cosmos DB Errors

**Error: Vector search not enabled**
```powershell
# Verify Cosmos DB capabilities
az cosmosdb show `
  --name $(terraform output -raw cosmos_account_name) `
  --resource-group $(terraform output -raw resource_group_name) `
  --query 'capabilities'

# Expected: EnableNoSQLVectorSearch
```

### Document Upload Errors

**Error: Storage connection failed**
```powershell
# Verify storage account
az storage account show `
  --name $(terraform output -raw storage_account_name) `
  --resource-group $(terraform output -raw resource_group_name)

# Test connection
az storage blob list `
  --account-name $(terraform output -raw storage_account_name) `
  --container-name documents
```

## Cleanup

To destroy all resources:

```powershell
cd terraform
terraform destroy -auto-approve
```

## Advanced Features Deployed

### 1. Consolidated Document Management
- ✅ All documents in single `pm-handbook` index
- ✅ Document tracking with chunk IDs
- ✅ Selective document deletion
- ✅ Metadata tracking

### 2. Vector Storage (Cosmos DB)
- ✅ Native vector search with VectorDistance
- ✅ 1536-dimension embeddings
- ✅ Cosine similarity
- ✅ Partition key: `/metadata/source`

### 3. RAG Pipeline
- ✅ Document chunking with overlap
- ✅ OpenAI embeddings (text-embedding-3-small)
- ✅ Semantic search across all documents
- ✅ Context-aware responses

### 4. Monitoring
- ✅ Application Insights integration
- ✅ Request tracking
- ✅ Error logging
- ✅ Performance metrics

## Next Steps

1. **Custom Domain**: Add custom domain to Static Web App
2. **Authentication**: Enable Azure AD authentication
3. **CI/CD**: Set up GitHub Actions for automated deployment
4. **Scaling**: Adjust Container App replicas based on load
5. **Backup**: Enable Cosmos DB backup policies

## Support

For issues or questions:
- Check Application Insights logs
- Review Cosmos DB metrics
- Verify Container App logs
- Test backend health endpoint
