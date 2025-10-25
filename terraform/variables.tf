# ============================================================================
# ProjectPal - Terraform Variables
# ============================================================================

# ============================================================================
# GENERAL CONFIGURATION
# ============================================================================

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "projectpal"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "static_web_app_location" {
  description = "Azure region for Static Web App (limited availability)"
  type        = string
  default     = "eastus2"
  
  validation {
    condition = contains([
      "eastus2", "westus2", "centralus", "eastasia", 
      "westeurope", "eastus", "centralindia"
    ], var.static_web_app_location)
    error_message = "Static Web Apps not available in all regions. Choose from: eastus2, westus2, centralus, eastasia, westeurope, eastus, centralindia."
  }
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "ProjectPal"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }
}

# ============================================================================
# CONTAINER REGISTRY (ACR)
# ============================================================================

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
  
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium."
  }
}

# ============================================================================
# COSMOS DB (DATABASE)
# ============================================================================

variable "cosmos_database_name" {
  description = "Name of the Cosmos DB database"
  type        = string
  default     = "projectpal"
}

variable "cosmos_container_name" {
  description = "Name of the Cosmos DB container"
  type        = string
  default     = "conversations"
}

# ============================================================================
# BLOB STORAGE
# ============================================================================

variable "storage_container_name" {
  description = "Name of the blob storage container"
  type        = string
  default     = "documents"
}

# ============================================================================
# STATIC WEB APP (FRONTEND)
# ============================================================================

variable "static_web_app_sku" {
  description = "SKU for Static Web App"
  type        = string
  default     = "Free"
  
  validation {
    condition     = contains(["Free", "Standard"], var.static_web_app_sku)
    error_message = "Static Web App SKU must be Free or Standard."
  }
}

# ============================================================================
# CONTAINER APPS (BACKEND)
# ============================================================================

variable "backend_image" {
  description = "Docker image for backend (will be constructed from ACR)"
  type        = string
  default     = "projectpal-backend:latest"
}

variable "backend_cpu" {
  description = "CPU allocation for backend container"
  type        = number
  default     = 0.5
  
  validation {
    condition     = contains([0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0], var.backend_cpu)
    error_message = "Backend CPU must be 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, or 2.0."
  }
}

variable "backend_memory" {
  description = "Memory allocation for backend container"
  type        = string
  default     = "1Gi"
  
  validation {
    condition     = can(regex("^[0-9]+(Gi|G)$", var.backend_memory))
    error_message = "Backend memory must be in format like '1Gi' or '2G'."
  }
}

variable "backend_min_replicas" {
  description = "Minimum number of backend replicas"
  type        = number
  default     = 0
  
  validation {
    condition     = var.backend_min_replicas >= 0 && var.backend_min_replicas <= 30
    error_message = "Minimum replicas must be between 0 and 30."
  }
}

variable "backend_max_replicas" {
  description = "Maximum number of backend replicas"
  type        = number
  default     = 5
  
  validation {
    condition     = var.backend_max_replicas >= 1 && var.backend_max_replicas <= 30
    error_message = "Maximum replicas must be between 1 and 30."
  }
}

# ============================================================================
# SECRETS (SENSITIVE)
# ============================================================================

variable "openai_api_key" {
  description = "OpenAI API key for AI features"
  type        = string
  sensitive   = true
  
  validation {
    condition     = can(regex("^sk-", var.openai_api_key))
    error_message = "OpenAI API key must start with 'sk-'."
  }
}

variable "openai_model" {
  description = "OpenAI model to use"
  type        = string
  default     = "gpt-4o-mini"
}
