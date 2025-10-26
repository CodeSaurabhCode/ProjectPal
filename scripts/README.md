# Deployment Scripts

Simple scripts to deploy and manage ProjectPal on Azure.

## Quick Start

### 1. Deploy Everything (First Time)

```powershell
.\scripts\deploy.ps1
```

This script will:
- ✅ Deploy all Azure infrastructure (Terraform)
- ✅ Build and push Docker image to ACR
- ✅ Deploy backend to Container Apps with CORS configured
- ✅ Build and deploy frontend to Static Web Apps
- ✅ **Automatically fetch and set URLs in Azure Container App**
- ✅ **Display all URLs at the end**

### 2. Update Backend Only

```powershell
.\scripts\deploy.ps1 -SkipInfrastructure -SkipFrontend
```

Useful when you've made changes to backend code.

### 3. Update Frontend Only

```powershell
.\scripts\deploy.ps1 -SkipInfrastructure -SkipBackend
```

Useful when you've made changes to frontend code.

### 4. Destroy Everything

```powershell
.\scripts\destroy.ps1
```

Removes all Azure resources.

## URL Management - SIMPLIFIED ✨

**No more manual URL configuration!** The `deploy.ps1` script now:

1. **Automatically fetches** deployed URLs from Azure resources
2. **Automatically sets** CORS environment variables in Azure Container App
3. **Shows URLs** in deployment summary

### What Gets Set Automatically:

| Location | Variables | Value |
|----------|-----------|-------|
| Azure Container App | `FRONTEND_URL` | `https://your-app.azurestaticapps.net` |
| Azure Container App | `ALLOWED_ORIGINS` | `https://your-app.azurestaticapps.net` |
| Frontend Build | `PUBLIC_BACKEND_URL` | `https://backend.azurecontainerapps.io` |

### For Production (Azure):
- ✅ All URLs set automatically during deployment
- ✅ No manual configuration needed
- ✅ No `.env` file needed in Azure

### For Local Development:

1. Copy the example file:
   ```powershell
   cp backend/.env.example backend/.env
   ```

2. Add your OpenAI API key:
   ```bash
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. Start development servers:
   ```powershell
   # Terminal 1: Backend
   cd backend
   npm run server:dev

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

The `.env.example` already has localhost URLs configured for local development.

## Common Tasks

### Get Deployed URLs

After deployment, the URLs are shown in the summary. Or run:

```powershell
cd terraform
terraform output
```

### View Backend Logs

```powershell
az containerapp logs show --name projectpal-dev-backend --resource-group projectpal-dev-rg --tail 20 --follow
```

### Test Deployed Backend

```powershell
# Health check
curl https://<backend-url>/api/health

# Chat endpoint
$body = @{ message = "Hello!" } | ConvertTo-Json
Invoke-WebRequest -Uri "https://<backend-url>/api/chat" -Method POST -Body $body -ContentType "application/json" -Headers @{ Origin = "https://<frontend-url>" }
```

### Rebuild and Redeploy After Code Changes

```powershell
# Backend changes
.\scripts\deploy.ps1 -SkipInfrastructure -SkipFrontend

# Frontend changes
.\scripts\deploy.ps1 -SkipInfrastructure -SkipBackend

# Both
.\scripts\deploy.ps1 -SkipInfrastructure
```

## Troubleshooting

### "Can't retrieve URLs"

Run deploy script first:
```powershell
.\scripts\deploy.ps1
```

### CORS Errors

The deploy script automatically configures CORS. If you still see errors:

1. Check that `FRONTEND_URL` and `ALLOWED_ORIGINS` are set in Container App:
   ```powershell
   az containerapp show --name <backend-name> --resource-group <rg-name> --query properties.template.containers[0].env
   ```

2. Redeploy backend with CORS fix:
   ```powershell
   .\scripts\deploy.ps1 -SkipInfrastructure -SkipFrontend
   ```

### Backend Not Responding

1. Check if container is running:
   ```powershell
   az containerapp revision list --name <backend-name> --resource-group <rg-name> --query "[].{Name:name, Active:properties.active, Replicas:properties.replicas}"
   ```

2. Scale to at least 1 replica if needed:
   ```powershell
   az containerapp update --name <backend-name> --resource-group <rg-name> --min-replicas 1
   ```

## Files Generated

During deployment, no local files are created. All configuration happens in Azure.

For local development, you create:
- `backend/.env` - Copy from `backend/.env.example` and add your OpenAI API key

## Cost Optimization

All resources use free/minimal tiers:
- Static Web App: Free tier
- Container App: Consumption plan (~$0.01/hour when running)
- Container Registry: Basic tier (~$5/month)
- Cosmos DB: Serverless (~$0.25/million requests)
- Storage: Minimal cost

To minimize costs, destroy when not in use:
```powershell
.\scripts\destroy.ps1
```

Then redeploy when needed:
```powershell
.\scripts\deploy.ps1
```
