# ============================================================================
# ProjectPal - Terraform Outputs
# ============================================================================

# ============================================================================
# GENERAL
# ============================================================================

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "location" {
  description = "Azure region"
  value       = azurerm_resource_group.main.location
}

# ============================================================================
# STATIC WEB APP (FRONTEND)
# ============================================================================

output "frontend_url" {
  description = "URL of the frontend Static Web App"
  value       = module.static_web_app.default_hostname
}

output "frontend_deployment_token" {
  description = "Deployment token for Static Web App (use in GitHub Actions)"
  value       = module.static_web_app.api_key
  sensitive   = true
}

# ============================================================================
# CONTAINER APPS (BACKEND)
# ============================================================================

output "backend_name" {
  description = "Name of the backend Container App"
  value       = module.container_apps.backend_name
}

output "backend_url" {
  description = "URL of the backend Container App"
  value       = module.container_apps.backend_url
}

output "backend_fqdn" {
  description = "Fully qualified domain name of the backend"
  value       = module.container_apps.backend_fqdn
}

# ============================================================================
# CONTAINER REGISTRY (ACR)
# ============================================================================

output "container_registry_login_server" {
  description = "Login server for Azure Container Registry"
  value       = module.container_registry.login_server
}

output "container_registry_name" {
  description = "Name of the Azure Container Registry"
  value       = module.container_registry.name
}

output "container_registry_admin_username" {
  description = "Admin username for ACR"
  value       = module.container_registry.admin_username
  sensitive   = true
}

# ============================================================================
# COSMOS DB
# ============================================================================

output "cosmos_db_endpoint" {
  description = "Endpoint URL for Cosmos DB"
  value       = module.cosmos_db.endpoint
}

output "cosmos_db_name" {
  description = "Name of the Cosmos DB account"
  value       = module.cosmos_db.account_name
}

output "cosmos_database_name" {
  description = "Name of the Cosmos DB database"
  value       = module.cosmos_db.database_name
}

output "cosmos_container_name" {
  description = "Name of the Cosmos DB container"
  value       = module.cosmos_db.container_name
}

output "cosmos_embeddings_container_name" {
  description = "Name of the Cosmos DB embeddings/vector container"
  value       = module.cosmos_db.embeddings_container_name
}

output "cosmos_db_connection_string" {
  description = "Connection string for Cosmos DB (for vector storage)"
  value       = module.cosmos_db.connection_strings[0]
  sensitive   = true
}

# ============================================================================
# BLOB STORAGE
# ============================================================================

output "storage_account_name" {
  description = "Name of the storage account"
  value       = module.storage.storage_account_name
}

output "storage_container_name" {
  description = "Name of the blob storage container"
  value       = module.storage.container_name
}

output "storage_primary_blob_endpoint" {
  description = "Primary blob endpoint"
  value       = module.storage.primary_blob_endpoint
}

output "storage_connection_string" {
  description = "Storage account connection string for blob storage"
  value       = module.storage.primary_connection_string
  sensitive   = true
}

# ============================================================================
# MONITORING
# ============================================================================

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics Workspace"
  value       = module.monitoring.log_analytics_workspace_id
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitoring.application_insights_instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.application_insights_connection_string
  sensitive   = true
}

# ============================================================================
# DEPLOYMENT INFO
# ============================================================================

output "deployment_commands" {
  description = "Commands to deploy applications"
  value = {
    acr_login = "az acr login --name ${module.container_registry.name}"
    build_backend = "docker build -t ${module.container_registry.login_server}/projectpal-backend:latest ./backend"
    push_backend = "docker push ${module.container_registry.login_server}/projectpal-backend:latest"
    frontend_deploy = "Use GitHub Actions with deployment token"
  }
}

output "next_steps" {
  description = "Next steps after Terraform deployment"
  value = <<-EOT
  
  ✅ Infrastructure deployed successfully!
  
  📋 Next Steps:
  
  1. Login to Azure Container Registry:
     az acr login --name ${module.container_registry.name}
  
  2. Build and push backend image:
     docker build -t ${module.container_registry.login_server}/projectpal-backend:latest ./backend
     docker push ${module.container_registry.login_server}/projectpal-backend:latest
  
  3. Deploy frontend to Static Web App:
     - Add deployment token to GitHub Secrets: AZURE_STATIC_WEB_APPS_API_TOKEN
     - Push to main branch to trigger deployment
  
  4. Access your application:
     Frontend: https://${module.static_web_app.default_hostname}
     Backend:  https://${module.container_apps.backend_fqdn}
  
  5. Monitor your application:
     - View logs in Azure Portal
     - Check Application Insights dashboard
  
  💰 Estimated Monthly Cost: $20-60
  
  EOT
}
