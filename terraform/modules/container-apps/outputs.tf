output "environment_id" {
  description = "ID of the Container Apps Environment"
  value       = azurerm_container_app_environment.main.id
}

output "environment_name" {
  description = "Name of the Container Apps Environment"
  value       = azurerm_container_app_environment.main.name
}

output "backend_id" {
  description = "ID of the backend Container App"
  value       = azurerm_container_app.backend.id
}

output "backend_name" {
  description = "Name of the backend Container App"
  value       = azurerm_container_app.backend.name
}

output "backend_fqdn" {
  description = "FQDN of the backend Container App"
  value       = azurerm_container_app.backend.ingress[0].fqdn
}

output "backend_url" {
  description = "URL of the backend Container App"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}
