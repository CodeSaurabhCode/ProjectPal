# ============================================================================
# Deploy ProjectPal to Azure
# ============================================================================
# Deploys complete infrastructure and applications
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipInfrastructure,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackend,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

# Get the project root directory (parent of scripts folder)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "Deploying ProjectPal to Azure..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# STEP 1: Deploy Infrastructure with Terraform
# ============================================================================

if (!$SkipInfrastructure) {
    Write-Host "Step 1: Deploying Infrastructure..." -ForegroundColor Cyan
    Write-Host ""
    
    Set-Location terraform
    
    # Terraform Plan
    Write-Host "Running Terraform Plan..." -ForegroundColor Yellow
    terraform plan -out=tfplan
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Terraform plan failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    # Terraform Apply
    Write-Host "Applying Terraform Configuration..." -ForegroundColor Yellow
    terraform apply tfplan
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Terraform apply failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    # Get outputs
    $acrName = terraform output -raw container_registry_name
    $acrServer = terraform output -raw container_registry_login_server
    $backendName = terraform output -raw backend_name
    $resourceGroup = terraform output -raw resource_group_name
    $frontendUrl = terraform output -raw frontend_url
    $backendUrl = terraform output -raw backend_url
    
    Set-Location ..
    
    Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping infrastructure deployment" -ForegroundColor Yellow
    Write-Host ""
    
    # Get outputs from existing infrastructure
    Set-Location terraform
    $acrName = terraform output -raw container_registry_name
    $acrServer = terraform output -raw container_registry_login_server
    $backendName = terraform output -raw backend_name
    $resourceGroup = terraform output -raw resource_group_name
    $frontendUrl = terraform output -raw frontend_url
    $backendUrl = terraform output -raw backend_url
    Set-Location ..
}

# ============================================================================
# STEP 2: Build and Deploy Backend
# ============================================================================

if (!$SkipBackend) {
    Write-Host "Step 2: Building and Deploying Backend..." -ForegroundColor Cyan
    Write-Host ""
    
    # Login to ACR
    Write-Host "Logging into Azure Container Registry..." -ForegroundColor Yellow
    az acr login --name $acrName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: ACR login failed" -ForegroundColor Red
        exit 1
    }
    
    # Build Docker image
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    docker build -t "${acrServer}/projectpal-backend:latest" ./backend
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker build failed" -ForegroundColor Red
        exit 1
    }
    
    # Push to ACR
    Write-Host "Pushing image to Azure Container Registry..." -ForegroundColor Yellow
    docker push "${acrServer}/projectpal-backend:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker push failed" -ForegroundColor Red
        exit 1
    }
    
    # Update Container App with CORS settings
    Write-Host "Updating Container App with CORS configuration..." -ForegroundColor Yellow
    az containerapp update `
        --name $backendName `
        --resource-group $resourceGroup `
        --image "${acrServer}/projectpal-backend:latest" `
        --set-env-vars "FRONTEND_URL=https://$frontendUrl" "ALLOWED_ORIGINS=https://$frontendUrl"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Container App update failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Backend deployed successfully!" -ForegroundColor Green
    Write-Host "  - CORS configured for: https://$frontendUrl" -ForegroundColor Green
    Write-Host "  - Environment variables updated with URLs" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping backend deployment" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 3: Deploy Frontend
# ============================================================================

if (!$SkipFrontend) {
    Write-Host "Step 3: Deploying Frontend..." -ForegroundColor Cyan
    Write-Host ""
    
    # Build frontend with backend URL
    Write-Host "Building frontend..." -ForegroundColor Yellow
    Set-Location frontend
    
    $env:PUBLIC_BACKEND_URL = $backendUrl
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    # Deploy to Static Web App
    Write-Host "Deploying frontend to Azure Static Web App..." -ForegroundColor Yellow
    Set-Location "$projectRoot\terraform"
    $deployToken = terraform output -raw frontend_deployment_token
    
    Set-Location "$projectRoot\frontend"
    npx @azure/static-web-apps-cli deploy ./dist --deployment-token $deployToken --env production
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Frontend deployment failed, but you can deploy manually later" -ForegroundColor Yellow
        Set-Location $projectRoot
    } else {
        Set-Location $projectRoot
        Write-Host "Frontend deployed successfully!" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "Skipping frontend deployment" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

Write-Host "============================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your application URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://$frontendUrl" -ForegroundColor White
Write-Host "  Backend:  $backendUrl" -ForegroundColor White
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  - CORS configured for: https://$frontendUrl" -ForegroundColor White
Write-Host "  - Backend environment variables updated in Azure Container App" -ForegroundColor White
Write-Host ""
Write-Host "Test your deployment:" -ForegroundColor Cyan
Write-Host "  # Test backend health:" -ForegroundColor White
Write-Host "  curl $backendUrl/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Test chat endpoint:" -ForegroundColor White
Write-Host '  $body = @{ message = "Hello!" } | ConvertTo-Json' -ForegroundColor Gray
Write-Host "  Invoke-WebRequest -Uri $backendUrl/api/chat -Method POST -Body `$body -ContentType 'application/json' -Headers @{ Origin = 'https://$frontendUrl' }" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Open frontend in browser:" -ForegroundColor White
Write-Host "  start https://$frontendUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Upload PM handbook to blob storage (optional)" -ForegroundColor White
Write-Host "  2. Test your application in the browser" -ForegroundColor White
Write-Host "  3. Check logs: az containerapp logs show --name $backendName --resource-group $resourceGroup --tail 20" -ForegroundColor White
Write-Host ""
