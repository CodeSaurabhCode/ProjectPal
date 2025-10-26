# ============================================================================
# Container Apps Module (Backend)
# ============================================================================
# Creates Container Apps Environment and Backend API Container App
# ============================================================================

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-${var.environment}-env"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}

resource "azurerm_container_app" "backend" {
  name                         = "${var.project_name}-${var.environment}-backend"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = var.container_registry_server
    username             = var.container_registry_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = var.container_registry_password
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  secret {
    name  = "cosmos-key"
    value = var.cosmos_key
  }

  secret {
    name  = "storage-key"
    value = var.storage_account_key
  }

  template {
    container {
      name   = "backend"
      # Use placeholder image for initial deployment, will be updated after Docker build
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = var.backend_cpu
      memory = var.backend_memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3001"
      }

      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }

      env {
        name  = "OPENAI_MODEL"
        value = var.openai_model
      }

      env {
        name  = "MEMORY_STORAGE_TYPE"
        value = "cosmos"
      }

      env {
        name  = "VECTOR_STORAGE_TYPE"
        value = "cosmos"
      }

      env {
        name  = "COSMOS_DB_ENDPOINT"
        value = var.cosmos_endpoint
      }

      env {
        name        = "COSMOS_DB_KEY"
        secret_name = "cosmos-key"
      }

      env {
        name  = "COSMOS_DB_DATABASE"
        value = var.cosmos_database_name
      }

      env {
        name  = "COSMOS_DB_CONTAINER"
        value = var.cosmos_container_name
      }

      env {
        name  = "COSMOS_VECTOR_DATABASE"
        value = var.cosmos_database_name
      }

      env {
        name  = "COSMOS_VECTOR_CONTAINER"
        value = "embeddings"
      }

      env {
        name  = "STORAGE_ACCOUNT_NAME"
        value = var.storage_account_name
      }

      env {
        name        = "STORAGE_ACCOUNT_KEY"
        secret_name = "storage-key"
      }

      env {
        name  = "STORAGE_CONTAINER_NAME"
        value = var.storage_container_name
      }

      env {
        name  = "FRONTEND_URL"
        value = var.frontend_url
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = var.frontend_url
      }

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = var.application_insights_connection_string
      }
    }

    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas
  }

  ingress {
    external_enabled = true
    target_port      = 3001
    
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags
}
