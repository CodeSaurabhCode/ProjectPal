# 🚀 ProjectPal - Azure Deployment Guide

Complete step-by-step guide to deploy ProjectPal to Azure using Terraform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start (5 Minutes)](#quick-start)
4. [Manual Deployment Steps](#manual-deployment-steps)
5. [Verification](#verification)
6. [CI/CD Setup](#cicd-setup)
7. [Troubleshooting](#troubleshooting)
8. [Cost Breakdown](#cost-breakdown)

---

## Prerequisites

### Required Software

**Install these tools before starting:**

```powershell
# 1. Azure CLI
winget install Microsoft.AzureCLI
az --version

# 2. Terraform
winget install HashiCorp.Terraform
terraform --version

# 3. Docker Desktop
winget install Docker.DockerDesktop

# 4. Git
winget install Git.Git
```

**Expected versions:**
- Azure CLI: 2.x or higher
- Terraform: 1.5 or higher
- Docker: 20.x or higher
- Git: 2.x or higher

### Azure Requirements

1. **Azure Account** - [Create free account](https://azure.microsoft.com/free/)
2. **OpenAI API Key** - [Get from OpenAI](https://platform.openai.com/api-keys)

### Login to Azure

```powershell
# Login (opens browser)
az login

# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show
```

---

## Architecture Overview

### What Gets Deployed

```
┌─────────────────────────────────────────────────────┐
│                  Azure Cloud                        │
│                                                     │
│  ┌────────────────┐         ┌──────────────────┐  │
│  │ Static Web App │────────▶│ Container App    │  │
│  │  (Frontend)    │   HTTPS │  (Backend API)   │  │
│  │    FREE        │         │  Auto-scaling    │  │
│  └────────────────┘         └──────────────────┘  │
│                                      │              │
│                                      ▼              │
│  ┌──────────────────────────────────────────────┐ │
│  │          Azure Cosmos DB                     │ │
│  │          (Serverless - Conversations)        │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │          Azure Blob Storage                  │ │
│  │          (PM Handbook Documents)             │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │          Application Insights                │ │
│  │          (Monitoring & Logs)                 │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Azure Resources Created

When you run `terraform apply`, it creates **12 Azure resources**:

1. **Resource Group** - Container for all resources
2. **Container Registry** - Stores Docker images
3. **Container Apps Environment** - Manages container apps
4. **Container App** - Runs backend API
5. **Static Web App** - Hosts frontend
6. **Cosmos DB Account** - NoSQL database
7. **Cosmos DB Database** - "projectpal" database
8. **Cosmos DB Container** - "conversations" container
9. **Storage Account** - Blob storage
10. **Storage Container** - "pm-handbook" container
11. **Log Analytics Workspace** - Centralized logging
12. **Application Insights** - Monitoring and analytics

---

## Quick Start

### Automated Deployment (Recommended)

```powershell
# 1. Clone repository
git clone https://github.com/CodeSaurabhCode/ProjectPal.git
cd ProjectPal

# 2. Initialize Terraform
.\scripts\init-terraform.ps1

# 3. Configure variables
cd terraform
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
# Add your OpenAI API key and subscription ID

# 4. Deploy everything
cd ..
.\scripts\deploy.ps1
```

**That's it!** The script will:
- ✅ Initialize Terraform
- ✅ Deploy all Azure infrastructure
- ✅ Build and push Docker image
- ✅ Update Container App with new image
- ✅ Display deployment URLs

**Total time: ~5-10 minutes**

---

## Manual Deployment Steps

For complete control or learning, follow these detailed steps.

### Step 1: Clone and Setup

```powershell
# Clone repository
git clone https://github.com/CodeSaurabhCode/ProjectPal.git
cd ProjectPal

# Install dependencies
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

### Step 2: Configure Terraform

```powershell
# Navigate to terraform directory
cd terraform

# Create configuration file
Copy-Item terraform.tfvars.example terraform.tfvars

# Edit configuration
notepad terraform.tfvars
```

**Edit `terraform.tfvars`:**

```hcl
# Required: Your Azure subscription ID
subscription_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Required: Your OpenAI API key
openai_api_key = "sk-..."

# Optional: Customize project name
project_name = "projectpal"
environment  = "dev"
location     = "East US"

# Optional: Resource sizing
backend_cpu_cores    = 0.5  # vCPU cores
backend_memory_gb    = 1.0  # GB memory
backend_min_replicas = 0    # Scale to zero
backend_max_replicas = 3    # Max instances
```

### Step 3: Initialize Terraform

```powershell
# Initialize (downloads providers)
terraform init
```

**Expected output:**
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/azurerm versions matching "~> 3.80"...
- Installing hashicorp/azurerm v3.80.0...

Terraform has been successfully initialized!
```

### Step 4: Plan Infrastructure

```powershell
# Preview what will be created
terraform plan -out=tfplan
```

**You'll see:**
- 12 resources to be created
- Estimated costs
- Configuration details

**Review carefully before proceeding!**

### Step 5: Deploy Infrastructure

```powershell
# Deploy to Azure (takes ~5 minutes)
terraform apply tfplan
```

**Deployment progress:**
```
module.monitoring.azurerm_log_analytics_workspace.main: Creating...
module.storage.azurerm_storage_account.main: Creating...
module.container_registry.azurerm_container_registry.main: Creating...
module.cosmos_db.azurerm_cosmosdb_account.main: Creating...
...
Apply complete! Resources: 12 added, 0 changed, 0 destroyed.
```

**Save the outputs:**
```powershell
# Get deployment information
terraform output

# Save to variables
$ACR_NAME = terraform output -raw container_registry_name
$ACR_SERVER = terraform output -raw container_registry_login_server
$BACKEND_NAME = terraform output -raw backend_name
$RG_NAME = terraform output -raw resource_group_name
$FRONTEND_URL = terraform output -raw frontend_url
$BACKEND_URL = terraform output -raw backend_url

# Display
echo "Frontend: https://$FRONTEND_URL"
echo "Backend: $BACKEND_URL"
```

### Step 6: Build and Deploy Backend

```powershell
# Navigate to project root
cd ..

# Login to Azure Container Registry
az acr login --name $ACR_NAME

# Build Docker image
docker build -t $ACR_SERVER/projectpal-backend:latest ./backend

# Push to registry
docker push $ACR_SERVER/projectpal-backend:latest

# Update Container App
az containerapp update `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --image "$ACR_SERVER/projectpal-backend:latest"

# Verify deployment
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.latestRevisionFqdn" `
  --output tsv
```

**Expected output:**
```
Building backend image...
[+] Building 45.2s
 => => naming to projectpalacr123.azurecr.io/projectpal-backend:latest

Pushing to Azure...
The push refers to repository [projectpalacr123.azurecr.io/projectpal-backend]
latest: digest: sha256:abc123... size: 1234

Container App updated successfully!
Revision: projectpal-dev-backend--abc123.azurecontainerapps.io
```

### Step 7: Deploy Frontend

**Option A: Manual Deployment**

```powershell
# Get deployment token
cd terraform
$DEPLOYMENT_TOKEN = terraform output -raw frontend_deployment_token
$SWA_NAME = terraform output -raw frontend_name

# Build frontend with backend URL
cd ..\frontend
$env:PUBLIC_BACKEND_URL = $(cd ..\terraform; terraform output -raw backend_url)
npm run build

# Install Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./dist --deployment-token $DEPLOYMENT_TOKEN --app-name $SWA_NAME
```

**Option B: Automated via GitHub Actions**

1. Get deployment token:
   ```powershell
   cd terraform
   terraform output -raw frontend_deployment_token
   ```

2. Add to GitHub Secrets:
   - Go to: `https://github.com/YOUR_USERNAME/ProjectPal/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: (paste token)

3. Push to main branch:
   ```powershell
   git add .
   git commit -m "Deploy to Azure"
   git push origin main
   ```

4. GitHub Actions automatically deploys!

### Step 8: Upload PM Handbook

```powershell
# Get storage account name
cd terraform
$STORAGE_ACCOUNT = terraform output -raw storage_account_name

# Upload handbook
cd ..\backend\docs
az storage blob upload `
  --account-name $STORAGE_ACCOUNT `
  --container-name pm-handbook `
  --name PM_handbook.txt `
  --file PM_handbook.txt `
  --auth-mode login
```

---

## Verification

### Test Backend API

```powershell
# Get backend URL
cd terraform
$BACKEND_URL = terraform output -raw backend_url

# Test health endpoint
curl "$BACKEND_URL/api/health"
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T12:00:00Z",
  "version": "1.0.0"
}
```

### Test Frontend

1. **Open browser:**
   ```powershell
   $FRONTEND_URL = terraform output -raw frontend_url
   start "https://$FRONTEND_URL"
   ```

2. **Test chat:**
   - Type a message
   - Check response from AI

3. **Verify in DevTools:**
   - Press F12
   - Go to Network tab
   - Send a chat message
   - Look for request to: `https://...azurecontainerapps.io/api/chat`
   - Status should be `200 OK`
   - No CORS errors in Console

### Verify Azure Resources

```powershell
# List all resources
az resource list --resource-group $RG_NAME --output table

# Check Container App logs
az containerapp logs show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --follow
```

### Check Application Insights

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Application Insights"
3. Select your instance: `projectpal-dev-appinsights`
4. View:
   - Live Metrics
   - Transaction search
   - Failures
   - Performance

---

## CI/CD Setup

### GitHub Actions Workflows

Three workflows are included:

1. **Terraform Plan** (`.github/workflows/terraform-plan.yml`)
   - Runs on pull requests
   - Validates Terraform code
   - Shows planned changes

2. **Terraform Apply** (`.github/workflows/terraform-apply.yml`)
   - Runs on merge to main
   - Deploys infrastructure changes

3. **Deploy Applications** (`.github/workflows/deploy-apps.yml`)
   - Runs on code changes
   - Builds and deploys backend
   - Deploys frontend

### Setup GitHub Secrets

Add these secrets to enable CI/CD:

```powershell
# 1. Create Azure Service Principal
az ad sp create-for-rbac `
  --name "github-actions-projectpal" `
  --role contributor `
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID" `
  --sdk-auth
```

**Copy the JSON output and add to GitHub:**

1. Go to: `https://github.com/YOUR_USERNAME/ProjectPal/settings/secrets/actions`

2. Add these secrets:

| Secret Name | Value | Source |
|------------|-------|--------|
| `AZURE_CREDENTIALS` | Full JSON output | Service principal |
| `AZURE_CLIENT_ID` | `clientId` from JSON | Service principal |
| `AZURE_CLIENT_SECRET` | `clientSecret` from JSON | Service principal |
| `AZURE_SUBSCRIPTION_ID` | Your subscription ID | Azure |
| `AZURE_TENANT_ID` | `tenantId` from JSON | Service principal |
| `OPENAI_API_KEY` | Your OpenAI key | OpenAI |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | From terraform output | Terraform |

### Test CI/CD

```powershell
# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "Test CI/CD"
git push origin main

# Watch workflows
start "https://github.com/YOUR_USERNAME/ProjectPal/actions"
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Terraform Init Failed

**Error:**
```
Error: Failed to query available provider packages
```

**Solution:**
```powershell
# Make sure you're logged into Azure
az login

# Verify account
az account show

# Retry
terraform init
```

#### Issue: CORS Errors in Browser

**Error:**
```
Access to fetch at 'https://...azurecontainerapps.io/api/chat'
from origin 'https://...azurestaticapps.net' has been blocked by CORS policy
```

**Solution:**
```powershell
# Check backend environment variables
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.template.containers[0].env"

# Should include:
# - FRONTEND_URL=https://your-frontend.azurestaticapps.net
# - ALLOWED_ORIGINS=https://your-frontend.azurestaticapps.net

# If missing, update:
$FRONTEND_URL = $(cd terraform; terraform output -raw frontend_url)
az containerapp update `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --set-env-vars "FRONTEND_URL=https://$FRONTEND_URL" "ALLOWED_ORIGINS=https://$FRONTEND_URL"
```

#### Issue: Container App Not Starting

**Error:**
```
Container terminated with exit code 1
```

**Solution:**
```powershell
# Check logs
az containerapp logs show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --tail 50

# Common causes:
# 1. Missing OPENAI_API_KEY
# 2. Invalid Cosmos DB connection
# 3. Port mismatch (should be 3001)

# Fix environment variables
az containerapp update `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --set-env-vars "OPENAI_API_KEY=sk-..."
```

#### Issue: Frontend Shows Wrong API URL

**Error:**
Frontend calls `http://localhost:3001` instead of Azure backend.

**Solution:**
```powershell
# Rebuild frontend with correct URL
cd frontend
$env:PUBLIC_BACKEND_URL = $(cd ..\terraform; terraform output -raw backend_url)
npm run build

# Redeploy
$DEPLOYMENT_TOKEN = $(cd ..\terraform; terraform output -raw frontend_deployment_token)
$SWA_NAME = $(cd ..\terraform; terraform output -raw frontend_name)
swa deploy ./dist --deployment-token $DEPLOYMENT_TOKEN --app-name $SWA_NAME
```

#### Issue: Cosmos DB Connection Failed

**Error:**
```
Error connecting to Cosmos DB: Unauthorized
```

**Solution:**
```powershell
# Verify Cosmos DB variables are set
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.template.containers[0].env" | grep COSMOS

# Should show:
# - COSMOS_ENDPOINT
# - COSMOS_KEY
# - COSMOS_DATABASE_NAME=projectpal
# - COSMOS_CONTAINER_NAME=conversations

# If missing, redeploy infrastructure:
cd terraform
terraform apply -auto-approve
```

#### Issue: High Costs

**Problem:** Azure bill is higher than expected.

**Solution:**
```powershell
# 1. Check current usage
az monitor metrics list `
  --resource $BACKEND_URL `
  --metric-names "Requests" `
  --start-time (Get-Date).AddDays(-7) `
  --end-time (Get-Date)

# 2. Enable scale-to-zero
cd terraform
# Edit terraform.tfvars:
# backend_min_replicas = 0

terraform apply -auto-approve

# 3. Use Cosmos DB free tier
# Edit terraform/modules/cosmos-db/main.tf:
# capabilities {
#   name = "EnableServerless"
# }
```

### Get Help

**Check logs:**
```powershell
# Container App logs
az containerapp logs show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --follow

# Terraform state
cd terraform
terraform show

# Azure Portal
start "https://portal.azure.com"
```

**Useful commands:**
```powershell
# List all resources
az resource list --resource-group $RG_NAME --output table

# Get all outputs
cd terraform
terraform output

# Check Container App status
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.runningStatus"
```

---

## Cost Breakdown

### Development Environment

| Component | Azure Service | Tier | Monthly Cost |
|-----------|---------------|------|--------------|
| **Frontend** | Static Web Apps | Free | $0 |
| **Backend** | Container Apps | 0.5 vCPU, 1GB, scale-to-zero | $10-20 |
| **Database** | Cosmos DB | Serverless | $5-15 |
| **Registry** | Container Registry | Basic | $5 |
| **Storage** | Blob Storage | Standard | $0.50 |
| **Monitoring** | Log Analytics + App Insights | Pay-as-you-go | $2-5 |
| **Total** | | | **$22-45/month** |

### Production Environment

| Component | Azure Service | Tier | Monthly Cost |
|-----------|---------------|------|--------------|
| **Frontend** | Static Web Apps | Standard | $9 |
| **Backend** | Container Apps | 1 vCPU, 2GB, min 1 replica | $35-60 |
| **Database** | Cosmos DB | Serverless | $25-50 |
| **Registry** | Container Registry | Basic | $5 |
| **Storage** | Blob Storage | Standard | $1 |
| **Monitoring** | Log Analytics + App Insights | Pay-as-you-go | $5-10 |
| **Total** | | | **$80-135/month** |

### Cost Optimization Tips

1. **Enable Scale-to-Zero**
   ```hcl
   # terraform/terraform.tfvars
   backend_min_replicas = 0  # Scales to zero when idle
   ```

2. **Use Cosmos DB Free Tier**
   - First 1000 RU/s and 25GB free
   - Perfect for development

3. **Set Budget Alerts**
   ```powershell
   az consumption budget create `
     --budget-name "ProjectPal-Monthly" `
     --amount 50 `
     --time-grain Monthly `
     --resource-group $RG_NAME
   ```

4. **Monitor Costs**
   - Go to: [Azure Cost Management](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement)
   - Set up daily cost alerts
   - Review usage weekly

5. **Clean Up Unused Resources**
   ```powershell
   # Delete everything when not needed
   cd terraform
   terraform destroy -auto-approve
   ```

---

## Project Structure

### Infrastructure Files

```
terraform/
├── main.tf                    # Main orchestration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output values
├── providers.tf               # Azure provider config
├── terraform.tfvars.example   # Example configuration
└── modules/                   # Reusable modules
    ├── container-registry/    # ACR module
    ├── cosmos-db/             # Cosmos DB module
    ├── storage/               # Blob Storage module
    ├── container-apps/        # Container Apps module
    ├── static-web-app/        # Static Web Apps module
    └── monitoring/            # Monitoring module
```

### Deployment Scripts

```
scripts/
├── init-terraform.ps1         # Initialize Terraform
├── deploy.ps1                 # Full deployment
└── destroy.ps1                # Clean up resources
```

### CI/CD Workflows

```
.github/workflows/
├── terraform-plan.yml         # Plan on PR
├── terraform-apply.yml        # Apply on merge
└── deploy-apps.yml            # Deploy containers
```

---

## Deployment Checklist

Before deploying, ensure:

- [ ] Azure CLI installed and logged in
- [ ] Terraform installed
- [ ] Docker Desktop running
- [ ] OpenAI API key obtained
- [ ] `terraform.tfvars` configured
- [ ] GitHub secrets added (for CI/CD)
- [ ] PM handbook file ready

After deployment, verify:

- [ ] Infrastructure deployed (12 resources)
- [ ] Backend accessible at Azure URL
- [ ] Frontend deployed to Static Web App
- [ ] No CORS errors in browser console
- [ ] PM handbook uploaded to blob storage
- [ ] Application Insights showing data
- [ ] Cost alerts configured

---

## Next Steps

After successful deployment:

1. **Configure Custom Domain**
   - Add custom domain to Static Web App
   - Update CORS origins in backend

2. **Enable Authentication**
   - Add Azure AD authentication
   - Protect API endpoints

3. **Setup Monitoring**
   - Configure Application Insights alerts
   - Set up availability tests

4. **Optimize Performance**
   - Enable CDN for frontend
   - Add Redis cache for backend

5. **Production Hardening**
   - Move secrets to Azure Key Vault
   - Enable managed identities
   - Configure backup policies

---

## Useful Commands Reference

```powershell
# Terraform
terraform init                      # Initialize
terraform plan                      # Preview changes
terraform apply                     # Deploy
terraform output                    # Show outputs
terraform destroy                   # Delete everything

# Azure CLI
az login                            # Login
az account show                     # Show current account
az resource list --output table     # List resources

# Container Apps
az containerapp logs show --follow  # View logs
az containerapp update              # Update app

# Static Web Apps
swa deploy                          # Deploy frontend

# Docker
docker build -t name .              # Build image
docker push name                    # Push to registry
```

---

## Support and Documentation

- **Azure Docs**: https://docs.microsoft.com/azure
- **Terraform Docs**: https://www.terraform.io/docs
- **Project Issues**: https://github.com/CodeSaurabhCode/ProjectPal/issues

---

## Success Criteria

✅ **Deployment Complete When:**

- Frontend accessible at: `https://your-app.azurestaticapps.net`
- Backend accessible at: `https://your-backend.azurecontainerapps.io`
- Chat works end-to-end
- No errors in browser console
- Application Insights showing telemetry
- Total cost under $50/month

---

**Congratulations! 🎉 ProjectPal is now deployed to Azure!**

For questions or issues, check the troubleshooting section or create an issue on GitHub.
