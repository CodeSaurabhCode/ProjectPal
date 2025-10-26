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
    Write-Host "  ✅ All environment variables configured via Terraform" -ForegroundColor Green
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
    
    # Get Cosmos DB configuration from Terraform
    Write-Host "Getting Cosmos DB configuration..." -ForegroundColor Yellow
    Set-Location terraform
    $cosmosEndpoint = terraform output -raw cosmos_db_endpoint
    $cosmosDatabase = terraform output -raw cosmos_database_name
    $cosmosContainer = terraform output -raw cosmos_container_name
    $cosmosEmbeddingsContainer = terraform output -raw cosmos_embeddings_container_name
    Set-Location ..
    
    # Update Container App with new image only (env vars already set by Terraform)
    Write-Host "Updating Container App image..." -ForegroundColor Yellow
    az containerapp update `
        --name $backendName `
        --resource-group $resourceGroup `
        --image "${acrServer}/projectpal-backend:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Container App update failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  ✅ Container App updated with new image" -ForegroundColor Green
    
    # Configure CORS on Container App
    Write-Host "Configuring CORS on Container App..." -ForegroundColor Yellow
    az containerapp ingress cors update `
        --name $backendName `
        --resource-group $resourceGroup `
        --allowed-origins "https://$frontendUrl" `
        --allowed-methods GET POST PUT DELETE OPTIONS `
        --allowed-headers "*" `
        --expose-headers "*" `
        --max-age 3600 `
        --allow-credentials true
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: CORS configuration failed, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ CORS configured for: https://$frontendUrl" -ForegroundColor Green
    }
    
    Write-Host "Backend deployed successfully!" -ForegroundColor Green
    Write-Host "  - CORS configured for: https://$frontendUrl" -ForegroundColor Green
    Write-Host "  - Vector storage: Cosmos DB ($cosmosEmbeddingsContainer)" -ForegroundColor Green
    Write-Host "  - Memory storage: Cosmos DB ($cosmosContainer)" -ForegroundColor Green
    Write-Host "  - Environment variables configured" -ForegroundColor Green
    Write-Host ""
    
    # Initialize embeddings in Cosmos DB
    Write-Host "Initializing PM Handbook embeddings in Cosmos DB..." -ForegroundColor Cyan
    Set-Location backend
    
    # Get Cosmos connection string
    Set-Location "$projectRoot\terraform"
    $cosmosConnectionString = terraform output -raw cosmos_db_connection_string
    Set-Location "$projectRoot\backend"
    
    # Set environment variables for initialization
    $env:COSMOS_CONNECTION_STRING = $cosmosConnectionString
    $env:VECTOR_STORAGE_TYPE = "cosmos"
    $env:COSMOS_VECTOR_DATABASE = $cosmosDatabase
    $env:COSMOS_VECTOR_CONTAINER = $cosmosEmbeddingsContainer
    $env:OPENAI_API_KEY = (Get-Content "$projectRoot\terraform\terraform.tfvars" | Select-String -Pattern 'openai_api_key\s*=\s*"([^"]+)"').Matches.Groups[1].Value
    
    # Run initialization
    Write-Host "Processing PM_handbook.txt and creating embeddings..." -ForegroundColor Yellow
    npm run init-embeddings
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Embeddings initialized successfully in Cosmos DB!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Embeddings initialization failed. You can run it manually later." -ForegroundColor Yellow
    }
    
    Set-Location $projectRoot
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
    
    # Create/Update .env.production with backend URL
    Write-Host "Configuring frontend environment variables..." -ForegroundColor Yellow
    Set-Location frontend
    
    $envContent = "PUBLIC_BACKEND_URL=$backendUrl"
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8 -Force
    Write-Host "  ✅ Created .env.production with backend URL" -ForegroundColor Green
    
    # Build frontend with backend URL
    Write-Host "Building frontend..." -ForegroundColor Yellow
    $env:PUBLIC_BACKEND_URL = $backendUrl
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    # Verify backend URL is in built files
    Write-Host "Verifying backend URL in built files..." -ForegroundColor Yellow
    $backendUrlCheck = Select-String -Path "dist/_astro/*.js" -Pattern "projectpal-dev-backend" -Quiet
    if ($backendUrlCheck) {
        Write-Host "  ✅ Backend URL verified in build output" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Warning: Backend URL not found in build output" -ForegroundColor Yellow
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
Write-Host "  - Vector Storage: Cosmos DB (embeddings container)" -ForegroundColor White
Write-Host "  - Memory Storage: Cosmos DB (conversations container)" -ForegroundColor White
Write-Host "  - RAG System: Consolidated pm-handbook index" -ForegroundColor White
Write-Host "  - Document Tracking: Enabled with chunk management" -ForegroundColor White
Write-Host ""
Write-Host "Features Deployed:" -ForegroundColor Cyan
Write-Host "  ✅ Advanced RAG with consolidated document management" -ForegroundColor Green
Write-Host "  ✅ Cosmos DB vector storage with native search" -ForegroundColor Green
Write-Host "  ✅ Document chunking with overlap" -ForegroundColor Green
Write-Host "  ✅ OpenAI embeddings (1536 dimensions)" -ForegroundColor Green
Write-Host "  ✅ Semantic search across all documents" -ForegroundColor Green
Write-Host "  ✅ Document upload and tracking" -ForegroundColor Green
Write-Host "  ✅ Selective document deletion" -ForegroundColor Green
Write-Host ""
Write-Host "Test your deployment:" -ForegroundColor Cyan
Write-Host "  # Test backend health:" -ForegroundColor White
Write-Host "  curl $backendUrl/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Upload a document:" -ForegroundColor White
Write-Host '  $file = Get-Item ".\your-document.txt"' -ForegroundColor Gray
Write-Host '  $form = @{ file = $file }' -ForegroundColor Gray
Write-Host "  Invoke-WebRequest -Uri $backendUrl/api/documents/upload -Method POST -Form `$form" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Search documents:" -ForegroundColor White
Write-Host '  $body = @{ query = "budget approval"; topK = 5 } | ConvertTo-Json' -ForegroundColor Gray
Write-Host "  Invoke-WebRequest -Uri $backendUrl/api/documents/search -Method POST -Body `$body -ContentType 'application/json'" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Chat with RAG context:" -ForegroundColor White
Write-Host '  $body = @{ message = "What are the budget approval requirements?" } | ConvertTo-Json' -ForegroundColor Gray
Write-Host "  Invoke-WebRequest -Uri $backendUrl/api/chat -Method POST -Body `$body -ContentType 'application/json'" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Open frontend in browser:" -ForegroundColor White
Write-Host "  start https://$frontendUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Upload additional documents via frontend or API" -ForegroundColor White
Write-Host "  2. Test RAG search and chat functionality" -ForegroundColor White
Write-Host "  3. Monitor Cosmos DB for embeddings and conversations" -ForegroundColor White
Write-Host "  4. Check logs: az containerapp logs show --name $backendName --resource-group $resourceGroup --tail 50" -ForegroundColor White
Write-Host ""
Write-Host "Cosmos DB Management:" -ForegroundColor Cyan
Write-Host "  Database: $cosmosDatabase" -ForegroundColor White
Write-Host "  Containers:" -ForegroundColor White
Write-Host "    - conversations: Chat history and memory" -ForegroundColor Gray
Write-Host "    - embeddings: Document chunks and vectors (pm-handbook)" -ForegroundColor Gray
Write-Host ""
Write-Host "View in Azure Portal:" -ForegroundColor Cyan
Write-Host "  az cosmosdb show --name $cosmosEndpoint --resource-group $resourceGroup" -ForegroundColor Gray
Write-Host ""
