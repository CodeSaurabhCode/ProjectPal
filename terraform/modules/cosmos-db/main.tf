# ============================================================================
# Cosmos DB Module (Serverless)
# ============================================================================
# Creates Azure Cosmos DB for conversation memory storage
# Uses serverless mode for cost optimization
# ============================================================================

resource "azurerm_cosmosdb_account" "main" {
  name                = "${var.project_name}-cosmos-${var.suffix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableServerless"
  }

  # Note: Vector search is enabled programmatically via the VectorStore service
  # The Azure Terraform provider doesn't support EnableNoSQLVectorSearch yet
  # The vector indexing policy is created when the container is initialized

  tags = var.tags
}

resource "azurerm_cosmosdb_sql_database" "main" {
  name                = var.database_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
}

resource "azurerm_cosmosdb_sql_container" "main" {
  name                = var.container_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_path  = "/threadId"

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

# Vector embeddings container for RAG
resource "azurerm_cosmosdb_sql_container" "embeddings" {
  name                = "embeddings"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_path  = "/metadata/source"

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    # Exclude embedding vector from normal indexing
    excluded_path {
      path = "/embedding/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  # Note: Vector indexing policy requires REST API or SDK
  # The vector index configuration will be created programmatically
  # via the application code when VectorStorageService initializes
}
