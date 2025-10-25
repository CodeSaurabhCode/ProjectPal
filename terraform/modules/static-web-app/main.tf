# ============================================================================
# Static Web App Module (Frontend)
# ============================================================================
# Creates Azure Static Web App to host Astro frontend (FREE tier)
# ============================================================================

resource "azurerm_static_web_app" "main" {
  name                = "${var.project_name}-${var.environment}-frontend"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = var.sku_tier
  sku_size            = var.sku_tier

  app_settings = {
    "PUBLIC_BACKEND_URL" = var.backend_api_url
  }

  tags = var.tags
}
