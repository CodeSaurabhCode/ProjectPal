# ============================================================================
# ProjectPal - Azure Infrastructure (Terraform)
# ============================================================================
# Architecture:
# - Frontend: Azure Static Web Apps (FREE tier)
# - Backend: Azure Container Apps (Consumption)
# - Database: Azure Cosmos DB (Serverless)
# - Storage: Azure Blob Storage
# - Registry: Azure Container Registry
# - Monitoring: Application Insights + Log Analytics
# ============================================================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.45"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Uncomment for remote state (recommended for production)
  # backend "azurerm" {
  #   resource_group_name  = "terraform-state-rg"
  #   storage_account_name = "tfstateprojectpal"
  #   container_name       = "tfstate"
  #   key                  = "projectpal.tfstate"
  # }
}

# ============================================================================
# PROVIDERS
# ============================================================================

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  
  # Skip automatic resource provider registration to avoid conflicts
  skip_provider_registration = true
}

provider "azuread" {}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "azurerm_client_config" "current" {}

# ============================================================================
# RANDOM SUFFIX FOR UNIQUE NAMES
# ============================================================================

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# ============================================================================
# RESOURCE GROUP
# ============================================================================

resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = var.project_name
    }
  )
}

# ============================================================================
# MONITORING MODULE
# ============================================================================

module "monitoring" {
  source = "./modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = var.tags
}

# ============================================================================
# STORAGE MODULE (Blob Storage for PM Handbook)
# ============================================================================

module "storage" {
  source = "./modules/storage"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  suffix              = random_string.suffix.result
  container_name      = var.storage_container_name
  tags                = var.tags
}

# ============================================================================
# COSMOS DB MODULE (Serverless)
# ============================================================================

module "cosmos_db" {
  source = "./modules/cosmos-db"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  suffix              = random_string.suffix.result
  database_name       = var.cosmos_database_name
  container_name      = var.cosmos_container_name
  tags                = var.tags
}

# ============================================================================
# CONTAINER REGISTRY MODULE (ACR)
# ============================================================================

module "container_registry" {
  source = "./modules/container-registry"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  suffix              = random_string.suffix.result
  sku                 = var.acr_sku
  tags                = var.tags
}

# ============================================================================
# CONTAINER APPS MODULE (Backend API)
# ============================================================================

module "container_apps" {
  source = "./modules/container-apps"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  
  # Log Analytics from monitoring module
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  
  # Container Registry
  container_registry_server          = module.container_registry.login_server
  container_registry_username        = module.container_registry.admin_username
  container_registry_password        = module.container_registry.admin_password
  
  # Backend configuration
  backend_image                      = var.backend_image
  backend_cpu                        = var.backend_cpu
  backend_memory                     = var.backend_memory
  backend_min_replicas               = var.backend_min_replicas
  backend_max_replicas               = var.backend_max_replicas
  
  # Environment variables for backend
  openai_api_key                     = var.openai_api_key
  openai_model                       = var.openai_model
  cosmos_endpoint                    = module.cosmos_db.endpoint
  cosmos_key                         = module.cosmos_db.primary_key
  cosmos_database_name               = var.cosmos_database_name
  cosmos_container_name              = var.cosmos_container_name
  storage_account_name               = module.storage.storage_account_name
  storage_account_key                = module.storage.storage_account_primary_key
  storage_container_name             = var.storage_container_name
  
  # Application Insights
  application_insights_connection_string = module.monitoring.application_insights_connection_string
  
  # Frontend URL for CORS
  frontend_url = "https://${module.static_web_app.default_hostname}"
  
  tags = var.tags
}

# ============================================================================
# STATIC WEB APPS MODULE (Frontend - FREE tier)
# ============================================================================

module "static_web_app" {
  source = "./modules/static-web-app"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.static_web_app_location
  resource_group_name = azurerm_resource_group.main.name
  sku_tier            = var.static_web_app_sku
  
  # Note: Backend API URL is set during frontend build, not here
  # This prevents circular dependency with container_apps module
  backend_api_url     = ""
  
  tags                = var.tags
}
