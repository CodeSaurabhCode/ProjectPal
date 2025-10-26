output "id" {
  description = "ID of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.id
}

output "account_name" {
  description = "Name of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.name
}

output "endpoint" {
  description = "Endpoint URL"
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "primary_key" {
  description = "Primary master key"
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
}

output "connection_strings" {
  description = "Connection strings"
  value       = azurerm_cosmosdb_account.main.connection_strings
  sensitive   = true
}

output "database_name" {
  description = "Name of the database"
  value       = azurerm_cosmosdb_sql_database.main.name
}

output "container_name" {
  description = "Name of the container"
  value       = azurerm_cosmosdb_sql_container.main.name
}

output "embeddings_container_name" {
  description = "Name of the embeddings/vector container"
  value       = azurerm_cosmosdb_sql_container.embeddings.name
}
