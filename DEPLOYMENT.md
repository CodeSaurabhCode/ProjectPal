# 🚀 ProjectPal - Azure Deployment Guide

Complete guide for deploying ProjectPal to Microsoft Azure using Terraform Infrastructure as Code.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Deploy (5 Minutes)](#quick-deploy-5-minutes)
3. [Manual Deployment Steps](#manual-deployment-steps)
4. [CI/CD Setup](#cicd-setup)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)
7. [Cost Management](#cost-management)

---

## Prerequisites

### Required Software

Install these tools before starting:

```powershell
# 1. Azure CLI
winget install Microsoft.AzureCLI
az --version  # Verify: 2.x or higher

# 2. Terraform
winget install HashiCorp.Terraform
terraform --version  # Verify: 1.5 or higher

# 3. Docker Desktop
winget install Docker.DockerDesktop
docker --version  # Verify: 20.x or higher

# 4. Git
winget install Git.Git
git --version  # Verify: 2.x or higher
```

### Azure Account Setup

**1. Create Azure Account:**
- Free account: https://azure.microsoft.com/free/
- $200 credit for 30 days
- 12 months of free services

**2. Get OpenAI API Key:**
- Visit: https://platform.openai.com/api-keys
- Create new secret key
- Save securely (you'll need it later)

**3. Login to Azure:**

```powershell
# Login (opens browser for authentication)
az login

# List all subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify current subscription
az account show --query "{Name:name, ID:id, State:state}" --output table
```

---

## Quick Deploy (5 Minutes)

### Automated Deployment Script

This is the fastest way to get ProjectPal running on Azure.

```powershell
# 1. Clone repository
git clone https://github.com/CodeSaurabhCode/ProjectPal.git
cd ProjectPal

# 2. Login to Azure
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 3. Initialize Terraform
.\scripts\init-terraform.ps1

# 4. Configure deployment variables
cd terraform
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
```

**Edit `terraform.tfvars`:**

```hcl
# Required
subscription_id = "your-azure-subscription-id"
openai_api_key = "sk-..."

# Optional (defaults are fine for dev)
project_name = "projectpal"
environment  = "dev"
location     = "East US"
```

```powershell
# 5. Deploy everything
cd ..
.\scripts\deploy.ps1
```

**The script will:**
- ✅ Initialize Terraform backend
- ✅ Create all Azure resources (12 total)
- ✅ Build Docker image for backend
- ✅ Push image to Azure Container Registry
- ✅ Deploy backend to Container Apps
- ✅ Deploy frontend to Static Web Apps
- ✅ Configure environment variables
- ✅ Display deployment URLs

**Total time: 5-10 minutes**

**Expected output:**
```
===========================================
  Deployment Complete! 🎉
===========================================

Frontend URL:  https://projectpal-dev.azurestaticapps.net
Backend URL:   https://projectpal-dev-backend.azurecontainerapps.io

Resources created:
  ✓ Resource Group
  ✓ Container Registry
  ✓ Container Apps Environment
  ✓ Container App (Backend)
  ✓ Static Web App (Frontend)
  ✓ Cosmos DB
  ✓ Blob Storage
  ✓ Application Insights
  ✓ Log Analytics Workspace

Cost estimate: $20-45/month (dev)

Next steps:
  1. Test frontend at the URL above
  2. Upload PM handbook to blob storage
  3. Configure custom domain (optional)
  4. Set up CI/CD (see CICD_SETUP.md)
```

---

## Manual Deployment Steps

For complete control or learning purposes, follow these detailed steps.

### Step 1: Clone Repository

```powershell
git clone https://github.com/CodeSaurabhCode/ProjectPal.git
cd ProjectPal
```

### Step 2: Install Dependencies

```powershell
# Backend
cd backend
npm install --legacy-peer-deps

# Frontend
cd ..\frontend
npm install

cd ..
```

### Step 3: Configure Terraform

```powershell
cd terraform

# Create config from template
Copy-Item terraform.tfvars.example terraform.tfvars

# Edit configuration
notepad terraform.tfvars
```

**Configure `terraform.tfvars`:**

```hcl
# ============================================================
# Required Variables
# ============================================================

# Your Azure subscription ID (from: az account show)
subscription_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Your OpenAI API key (from: platform.openai.com)
openai_api_key = "sk-proj-..."

# ============================================================
# Optional Variables (customize as needed)
# ============================================================

# Project naming
project_name = "projectpal"        # alphanumeric only, lowercase
environment  = "dev"               # dev, staging, prod

# Azure region
location = "East US"               # or "West US", "Central US", etc.

# Backend Container Configuration
backend_cpu_cores    = 0.5         # vCPU cores (0.25, 0.5, 0.75, 1.0)
backend_memory_gb    = 1.0         # GB memory (0.5, 1.0, 1.5, 2.0)
backend_min_replicas = 0           # Min instances (0 = scale to zero)
backend_max_replicas = 3           # Max instances

# Cosmos DB Configuration
cosmos_max_throughput = 1000       # Max RU/s for serverless

# Tags
tags = {
  Project     = "ProjectPal"
  Environment = "Development"
  ManagedBy   = "Terraform"
}
```

### Step 4: Initialize Terraform

```powershell
# Initialize (downloads providers and modules)
terraform init

# Expected output:
# Initializing modules...
# Initializing the backend...
# Initializing provider plugins...
# - Finding hashicorp/azurerm versions matching "~> 3.80"...
# - Installing hashicorp/azurerm v3.80.0...
# 
# Terraform has been successfully initialized!
```

**If using remote state (recommended):**

The remote state is already configured in `main.tf`:

```hcl
backend "azurerm" {
  resource_group_name  = "terraform-state-rg"
  storage_account_name = "tfstateprojectpal123"
  container_name       = "tfstate"
  key                  = "projectpal.tfstate"
}
```

### Step 5: Plan Infrastructure

```powershell
# Preview what will be created
terraform plan -out=tfplan

# Review the output carefully!
# You should see:
# - 12 resources to ADD
# - 0 to CHANGE
# - 0 to DESTROY
```

**Resources that will be created:**

1. `azurerm_resource_group.main` - Container for all resources
2. `azurerm_container_registry.main` - Docker image registry
3. `azurerm_log_analytics_workspace.main` - Centralized logging
4. `azurerm_application_insights.main` - APM and monitoring
5. `azurerm_container_app_environment.main` - Container Apps platform
6. `azurerm_container_app.backend` - Backend application
7. `azurerm_static_web_app.frontend` - Frontend application
8. `azurerm_cosmosdb_account.main` - Cosmos DB account
9. `azurerm_cosmosdb_sql_database.main` - Database
10. `azurerm_cosmosdb_sql_container.conversations` - Container
11. `azurerm_storage_account.main` - Blob storage account
12. `azurerm_storage_container.handbook` - Handbook container

### Step 6: Deploy Infrastructure

```powershell
# Apply the plan (creates resources in Azure)
terraform apply tfplan

# This takes about 5-8 minutes
# Progress will be shown for each resource
```

**Monitor progress:**

```
azurerm_resource_group.main: Creating...
azurerm_resource_group.main: Creation complete after 2s
azurerm_container_registry.main: Creating...
azurerm_log_analytics_workspace.main: Creating...
azurerm_storage_account.main: Creating...
azurerm_cosmosdb_account.main: Creating...
...
Apply complete! Resources: 12 added, 0 changed, 0 destroyed.

Outputs:
backend_url = "https://projectpal-dev-backend.azurecontainerapps.io"
frontend_url = "https://projectpal-dev.azurestaticapps.net"
container_registry_name = "projectpalacr123"
container_registry_login_server = "projectpalacr123.azurecr.io"
resource_group_name = "projectpal-dev-rg"
```

### Step 7: Save Terraform Outputs

```powershell
# Save outputs to variables for later use
$ACR_NAME = terraform output -raw container_registry_name
$ACR_SERVER = terraform output -raw container_registry_login_server
$BACKEND_NAME = terraform output -raw backend_name
$RG_NAME = terraform output -raw resource_group_name
$FRONTEND_URL = terraform output -raw frontend_url
$BACKEND_URL = terraform output -raw backend_url

# Display them
Write-Host "Container Registry: $ACR_NAME" -ForegroundColor Green
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Green
Write-Host "Frontend URL: https://$FRONTEND_URL" -ForegroundColor Green
```

### Step 8: Build and Deploy Backend

```powershell
# Navigate to project root
cd ..

# Login to Azure Container Registry
az acr login --name $ACR_NAME

# Build Docker image
Write-Host "Building backend Docker image..." -ForegroundColor Yellow
docker build -t $ACR_SERVER/projectpal-backend:latest ./backend

# Push to Azure Container Registry
Write-Host "Pushing to Azure Container Registry..." -ForegroundColor Yellow
docker push $ACR_SERVER/projectpal-backend:latest

# Update Container App with new image
Write-Host "Updating Container App..." -ForegroundColor Yellow
az containerapp update `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --image "$ACR_SERVER/projectpal-backend:latest"

Write-Host "Backend deployed successfully!" -ForegroundColor Green
```

### Step 9: Deploy Frontend

**Option A: Automatic via GitHub (Recommended)**

1. Get deployment token:
   ```powershell
   cd terraform
   $DEPLOY_TOKEN = terraform output -raw frontend_deployment_token
   Write-Host "Deployment Token: $DEPLOY_TOKEN"
   ```

2. Add to GitHub Secrets:
   - Go to: `Settings → Secrets and variables → Actions`
   - Click "New repository secret"
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: (paste token from above)

3. Push code:
   ```powershell
   git add .
   git commit -m "Deploy to Azure"
   git push origin main
   ```

4. GitHub Actions will automatically build and deploy!

**Option B: Manual Deployment**

```powershell
# Get deployment token
cd terraform
$DEPLOYMENT_TOKEN = terraform output -raw frontend_deployment_token
$SWA_NAME = terraform output -raw frontend_name

# Build frontend
cd ..\frontend
$env:PUBLIC_BACKEND_URL = $(cd ..\terraform; terraform output -raw backend_url)
npm run build

# Install Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./dist --deployment-token $DEPLOYMENT_TOKEN --app-name $SWA_NAME

Write-Host "Frontend deployed successfully!" -ForegroundColor Green
```

### Step 10: Upload PM Handbook

```powershell
# Get storage account name
cd terraform
$STORAGE_ACCOUNT = terraform output -raw storage_account_name

# Upload handbook document
cd ..\backend\docs
az storage blob upload `
  --account-name $STORAGE_ACCOUNT `
  --container-name pm-handbook `
  --name PM_handbook.txt `
  --file PM_handbook.txt `
  --auth-mode login

Write-Host "PM Handbook uploaded successfully!" -ForegroundColor Green
```

---

## CI/CD Setup

### Overview

ProjectPal includes 4 GitHub Actions workflows for automated deployment:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **pr-validation.yml** | Pull Requests | Lint, build checks |
| **terraform-plan.yml** | PRs with Terraform changes | Preview infra changes |
| **terraform-apply.yml** | Merge to main (terraform/**) | Deploy infrastructure |
| **deploy-apps.yml** | Merge to main (backend/**, frontend/**) | Deploy applications |

### Setup Steps

**1. Create Azure Service Principal**

```powershell
# Get your subscription ID
$SUBSCRIPTION_ID = az account show --query id --output tsv

# Create service principal
$SP = az ad sp create-for-rbac `
  --name "github-actions-projectpal" `
  --role Contributor `
  --scopes "/subscriptions/$SUBSCRIPTION_ID" `
  --sdk-auth | ConvertFrom-Json

# Display credentials (save these!)
Write-Host "AZURE_CLIENT_ID: $($SP.clientId)" -ForegroundColor Yellow
Write-Host "AZURE_CLIENT_SECRET: $($SP.clientSecret)" -ForegroundColor Yellow
Write-Host "AZURE_SUBSCRIPTION_ID: $($SP.subscriptionId)" -ForegroundColor Yellow
Write-Host "AZURE_TENANT_ID: $($SP.tenantId)" -ForegroundColor Yellow
```

**2. Get Additional Secrets**

```powershell
# Get deployment tokens from Terraform
cd terraform

# Static Web Apps deployment token
$SWA_TOKEN = terraform output -raw frontend_deployment_token
Write-Host "AZURE_STATIC_WEB_APPS_API_TOKEN: $SWA_TOKEN" -ForegroundColor Yellow

# Container Registry credentials
$ACR_NAME = terraform output -raw container_registry_name
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username --output tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query passwords[0].value --output tsv

Write-Host "ACR_USERNAME: $ACR_USERNAME" -ForegroundColor Yellow
Write-Host "ACR_PASSWORD: $ACR_PASSWORD" -ForegroundColor Yellow
```

**3. Add GitHub Secrets**

Go to: `https://github.com/YOUR_USERNAME/ProjectPal/settings/secrets/actions`

Click "New repository secret" for each:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `AZURE_CLIENT_ID` | (from step 1) | Service principal |
| `AZURE_CLIENT_SECRET` | (from step 1) | Service principal |
| `AZURE_SUBSCRIPTION_ID` | (from step 1) | Service principal |
| `AZURE_TENANT_ID` | (from step 1) | Service principal |
| `OPENAI_API_KEY` | `sk-...` | OpenAI Platform |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | (from step 2) | Terraform output |
| `ACR_USERNAME` | (from step 2) | Azure Container Registry |
| `ACR_PASSWORD` | (from step 2) | Azure Container Registry |

**4. Test CI/CD**

```powershell
# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add .
git commit -m "Test CI/CD deployment"
git push origin main

# Watch workflows execute
start "https://github.com/YOUR_USERNAME/ProjectPal/actions"
```

**Expected workflow:**
1. ✅ PR Validation passes (if this was a PR)
2. ✅ Terraform Apply runs (if terraform files changed)
3. ✅ Deploy Apps builds and deploys backend + frontend
4. 🎉 App is live with new changes!

---

## Verification & Testing

### 1. Test Backend API

```powershell
# Get backend URL
cd terraform
$BACKEND_URL = terraform output -raw backend_url

# Health check
curl "$BACKEND_URL/api/health"

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-25T12:00:00Z",
#   "version": "1.0.0",
#   "uptime": 123
# }
```

### 2. Test Frontend

```powershell
# Get frontend URL
$FRONTEND_URL = terraform output -raw frontend_url

# Open in browser
start "https://$FRONTEND_URL"
```

**Frontend Tests:**

1. ✅ Page loads without errors
2. ✅ Chat interface is visible
3. ✅ Type a message: "Hi, how are you?"
4. ✅ Receive AI response
5. ✅ No CORS errors in DevTools Console (F12)

### 3. Test End-to-End

Try these queries in the chat:

```
1. "Who are the available data scientists?"
   → Should return team members

2. "What's the approval process for $100k projects?"
   → Should search PM handbook and provide answer

3. "Create a kickoff ticket for my project"
   → Should create a ticket

4. "Hi, I'm starting a new project"
   → Should have natural conversation
```

### 4. Verify Azure Resources

```powershell
# List all deployed resources
az resource list --resource-group $RG_NAME --output table

# Check Container App status
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.runningStatus" `
  --output tsv

# Expected: "Running"
```

### 5. Check Application Insights

```powershell
# Open Application Insights in portal
$AI_NAME = terraform output -raw application_insights_name
az monitor app-insights component show `
  --app $AI_NAME `
  --resource-group $RG_NAME

# Or open in portal
start "https://portal.azure.com/#@/resource/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.Insights/components/$AI_NAME"
```

**Check for:**
- ✅ Live Metrics showing traffic
- ✅ Successful requests (200 OK)
- ✅ No errors or exceptions
- ✅ Average response time < 500ms

### 6. View Container Logs

```powershell
# Stream live logs
az containerapp logs show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --follow

# Or tail recent logs
az containerapp logs show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --tail 50
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Terraform Init Failed

**Error:**
```
Error: Failed to query available provider packages
```

**Solution:**
```powershell
# Ensure you're logged into Azure
az login
az account show

# Retry init
terraform init
```

#### Issue 2: CORS Errors

**Error in browser console:**
```
Access to fetch at 'https://xxx.azurecontainerapps.io/api/chat'
from origin 'https://xxx.azurestaticapps.net' has been blocked by CORS
```

**Solution:**

```powershell
# Check current environment variables
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.template.containers[0].env"

# Update CORS origins
$FRONTEND_URL = $(cd terraform; terraform output -raw frontend_url)
az containerapp update `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --set-env-vars `
    "FRONTEND_URL=https://$FRONTEND_URL" `
    "ALLOWED_ORIGINS=https://$FRONTEND_URL"

# Restart to apply changes
az containerapp revision restart `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME
```

#### Issue 3: Container App Not Starting

**Error:**
```
Container terminated with exit code 1
```

**Diagnosis:**

```powershell
# Check logs for error
az containerapp logs show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --tail 100
```

**Common causes & fixes:**

```powershell
# 1. Missing OPENAI_API_KEY
az containerapp update `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --set-env-vars "OPENAI_API_KEY=sk-..."

# 2. Port mismatch (should be 3001)
# Check Dockerfile exposes port 3001
# Check server.ts listens on process.env.PORT || 3001

# 3. Invalid Cosmos DB credentials
# Re-run terraform apply to refresh
cd terraform
terraform apply -auto-approve
```

#### Issue 4: Frontend Shows Wrong API URL

**Problem:** Frontend calling `localhost:3001` instead of Azure backend

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

#### Issue 5: Database Connection Failed

**Error in logs:**
```
Error connecting to Cosmos DB: Unauthorized
```

**Solution:**

```powershell
# Verify Cosmos DB variables
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.template.containers[0].env" | Select-String "COSMOS"

# Should show:
# - COSMOS_ENDPOINT
# - COSMOS_KEY
# - COSMOS_DATABASE_NAME
# - COSMOS_CONTAINER_NAME

# If missing, re-apply terraform
cd terraform
terraform apply -refresh-only -auto-approve
```

#### Issue 6: High Costs

**Problem:** Azure bill higher than expected

**Diagnosis:**

```powershell
# Check current spending
az consumption usage list `
  --start-date (Get-Date).AddDays(-7).ToString("yyyy-MM-dd") `
  --end-date (Get-Date).ToString("yyyy-MM-dd") | ConvertFrom-Json

# Check Container App scaling
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "properties.template.scale"
```

**Solutions:**

```powershell
# 1. Enable scale-to-zero
cd terraform
# Edit terraform.tfvars:
# backend_min_replicas = 0
terraform apply -auto-approve

# 2. Reduce max replicas
# Edit terraform.tfvars:
# backend_max_replicas = 1
terraform apply -auto-approve

# 3. Set budget alert
az consumption budget create `
  --budget-name "ProjectPal-Monthly" `
  --amount 50 `
  --category Cost `
  --time-grain Monthly `
  --resource-group $RG_NAME
```

### Get Help

**Check logs:**
```powershell
# Container App logs
az containerapp logs show --name $BACKEND_NAME --resource-group $RG_NAME --follow

# Terraform state
cd terraform
terraform show

# All outputs
terraform output
```

**Useful commands:**
```powershell
# List all resources
az resource list --resource-group $RG_NAME --output table

# Container App status
az containerapp show `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME `
  --query "{Name:name,Status:properties.runningStatus,Replicas:properties.runningStatus}" `
  --output table

# Restart Container App
az containerapp revision restart `
  --name $BACKEND_NAME `
  --resource-group $RG_NAME
```

---

## Cost Management

### Monthly Cost Estimates

#### Development Environment

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| Static Web Apps | Free tier | $0 |
| Container Apps | 0.5 vCPU, 1GB, scale-to-zero | $10-20 |
| Cosmos DB | Serverless, ~10M RU | $5-15 |
| Container Registry | Basic tier | $5 |
| Blob Storage | Standard LRS, <1GB | $0.50 |
| Monitoring | Log Analytics + App Insights | $2-5 |
| **Total** | | **$22-45/month** |

#### Production Environment

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| Static Web Apps | Standard tier | $9 |
| Container Apps | 1 vCPU, 2GB, min 1 replica | $35-60 |
| Cosmos DB | Serverless, ~50M RU | $25-50 |
| Container Registry | Basic tier | $5 |
| Blob Storage | Standard LRS, <5GB | $1 |
| Monitoring | Log Analytics + App Insights | $5-10 |
| **Total** | | **$80-135/month** |

### Cost Optimization Tips

**1. Enable Scale-to-Zero (Dev)**

```hcl
# terraform/terraform.tfvars
backend_min_replicas = 0  # Scales to zero when idle
```

**Savings:** ~$10-15/month when not in use

**2. Use Cosmos DB Free Tier**

- First 1000 RU/s free
- First 25GB storage free
- Perfect for development

**Savings:** ~$5-10/month

**3. Set Budget Alerts**

```powershell
az consumption budget create `
  --budget-name "ProjectPal-Alert" `
  --amount 50 `
  --category Cost `
  --time-grain Monthly `
  --time-period "{ 'start-date': '$(Get-Date -Format 'yyyy-MM-01')', 'end-date': '2030-12-31' }" `
  --resource-group $RG_NAME `
  --notifications "[{ 'enabled': true, 'operator': 'GreaterThan', 'threshold': 80, 'contact-emails': ['your@email.com'] }]"
```

**4. Monitor Costs Weekly**

```powershell
# Check current month spending
az consumption usage list `
  --start-date (Get-Date -Day 1).ToString("yyyy-MM-dd") `
  --end-date (Get-Date).ToString("yyyy-MM-dd") `
  --query "[].{Service:name.value, Cost:pretaxCost}" `
  --output table
```

**5. Clean Up When Not Needed**

```powershell
# Destroy all resources
cd terraform
terraform destroy -auto-approve
```

**Savings:** 100% (but need to redeploy later)

---

## Cleanup / Destruction

### Delete All Resources

**⚠️ WARNING: This is irreversible!**

```powershell
# Navigate to terraform directory
cd terraform

# Preview what will be deleted
terraform plan -destroy

# Delete all resources
terraform destroy -auto-approve

# Expected output:
# Destroy complete! Resources: 12 destroyed.
```

### Partial Cleanup

**Delete only specific resources:**

```powershell
# Delete just the backend
terraform destroy -target=module.container_apps.azurerm_container_app.backend

# Delete only frontend
terraform destroy -target=module.static_web_app.azurerm_static_web_app.frontend
```

---

## Success Checklist

✅ **Deployment Complete When:**

- [ ] All 12 Azure resources created successfully
- [ ] Frontend accessible at Static Web Apps URL
- [ ] Backend accessible at Container Apps URL
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Chat works end-to-end in browser
- [ ] No CORS errors in browser console
- [ ] PM handbook uploaded to blob storage
- [ ] Application Insights showing telemetry
- [ ] CI/CD workflows passing (if configured)
- [ ] Monthly cost under budget ($50 for dev)

---

## Additional Resources

- **Azure Portal**: https://portal.azure.com
- **Terraform Docs**: https://www.terraform.io/docs
- **Azure Docs**: https://docs.microsoft.com/azure
- **Project Issues**: https://github.com/CodeSaurabhCode/ProjectPal/issues
- **CI/CD Setup**: [.github/CICD_SETUP.md](.github/CICD_SETUP.md)
- **Architecture**: [README.md](README.md)

---

**🎉 Congratulations! ProjectPal is now deployed to Azure!**

For questions or issues, check the troubleshooting section above or create an issue on GitHub.
