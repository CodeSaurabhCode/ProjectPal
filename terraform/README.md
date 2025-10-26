# Terraform Infrastructure - ProjectPal

Infrastructure as Code for deploying ProjectPal to Azure.

## 📖 Complete Deployment Guide

**👉 See [../DEPLOYMENT.md](../DEPLOYMENT.md) for the complete step-by-step deployment guide.**

The main deployment guide includes:
- ✅ Prerequisites and setup
- ✅ Architecture overview  
- ✅ Quick start (automated)
- ✅ Manual deployment steps
- ✅ Verification procedures
- ✅ CI/CD setup
- ✅ Troubleshooting
- ✅ Cost breakdown

---

## Quick Reference

### Initialize

```powershell
# From project root
.\scripts\init-terraform.ps1

# Or manually
cd terraform
terraform init
```

### Configure

```powershell
# Create configuration
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
```

**Required variables:**
- `subscription_id` - Azure subscription ID
- `openai_api_key` - OpenAI API key

**Optional variables:**
- `project_name` - Project name (default: "projectpal")
- `environment` - Environment (default: "dev")
- `location` - Azure region (default: "East US")

### Deploy

```powershell
# Preview changes
terraform plan -out=tfplan

# Deploy infrastructure
terraform apply tfplan

# View outputs
terraform output
```

### Useful Commands

```powershell
# Show current state
terraform show

# Get specific output
terraform output backend_url

# List all resources
terraform state list

# Destroy everything
terraform destroy
```

---

## Project Structure

```
terraform/
├── main.tf                    # Main orchestration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output values
├── providers.tf               # Azure provider config
├── terraform.tfvars.example   # Example configuration
└── modules/                   # Reusable modules
    ├── container-registry/    # Azure Container Registry
    ├── cosmos-db/             # Cosmos DB for NoSQL
    ├── storage/               # Blob Storage
    ├── container-apps/        # Container Apps (backend)
    ├── static-web-app/        # Static Web App (frontend)
    └── monitoring/            # Application Insights
```

---

## What Gets Created

When you run `terraform apply`, it creates:

1. **Resource Group** - Container for all resources
2. **Container Registry** - Stores Docker images
3. **Container Apps Environment** - Manages container apps
4. **Container App** - Runs backend API
5. **Static Web App** - Hosts frontend
6. **Cosmos DB Account** - NoSQL database
7. **Cosmos DB Database** - "projectpal" database  
8. **Cosmos DB Container** - "conversations" container
9. **Storage Account** - Blob storage
10. **Storage Container** - "pm-handbook" container
11. **Log Analytics Workspace** - Centralized logging
12. **Application Insights** - Monitoring and analytics

**Total: 12 Azure resources**

---

## Outputs

After deployment, Terraform outputs:

```powershell
backend_url                    # Backend API URL
frontend_url                   # Frontend web app URL
container_registry_name        # ACR name
container_registry_login_server # ACR login server
resource_group_name            # Resource group name
frontend_deployment_token      # Token for deploying frontend
storage_account_name           # Storage account name
```

**Get outputs:**
```powershell
terraform output                      # All outputs
terraform output backend_url          # Specific output
terraform output -raw backend_url     # Without quotes
```

---

## Environments

### Development (Default)

```hcl
# terraform.tfvars
environment          = "dev"
backend_cpu_cores    = 0.5
backend_memory_gb    = 1.0
backend_min_replicas = 0    # Scale to zero
backend_max_replicas = 3
```

**Cost: ~$20-45/month**

### Production

```hcl
# terraform.tfvars
environment          = "prod"
backend_cpu_cores    = 1.0
backend_memory_gb    = 2.0
backend_min_replicas = 1    # Always running
backend_max_replicas = 10
```

**Cost: ~$80-135/month**

---

## CI/CD with GitHub Actions

Three workflows are included:

1. **terraform-plan.yml** - Runs `terraform plan` on pull requests
2. **terraform-apply.yml** - Runs `terraform apply` on merge to main
3. **deploy-apps.yml** - Builds and deploys applications

**Setup:**
1. Add GitHub secrets (see [../DEPLOYMENT.md](../DEPLOYMENT.md#cicd-setup))
2. Push to main branch
3. Workflows run automatically

---

## Troubleshooting

### Common Issues

**Terraform init failed**
```powershell
az login
az account show
terraform init
```

**Resource already exists**
```powershell
# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/...
```

**State locked**
```powershell
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

**Cost too high**
```hcl
# Edit terraform.tfvars
backend_min_replicas = 0  # Enable scale-to-zero
```

### Get Help

```powershell
# View detailed state
terraform show

# Validate configuration
terraform validate

# Format code
terraform fmt

# Check logs
az containerapp logs show --name BACKEND_NAME --resource-group RG_NAME --follow
```

---

## Module Documentation

Each module has its own README:

- [container-registry](modules/container-registry/README.md) - ACR configuration
- [cosmos-db](modules/cosmos-db/README.md) - Cosmos DB setup
- [storage](modules/storage/README.md) - Blob Storage config
- [container-apps](modules/container-apps/README.md) - Backend deployment
- [static-web-app](modules/static-web-app/README.md) - Frontend deployment
- [monitoring](modules/monitoring/README.md) - Logging & monitoring

---

## Additional Resources

- **[Main Deployment Guide](../DEPLOYMENT.md)** - Complete walkthrough
- **[Azure Terraform Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)** - Provider docs
- **[Terraform Best Practices](https://www.terraform-best-practices.com/)** - Best practices guide
- **[Azure Documentation](https://docs.microsoft.com/azure)** - Azure docs

---

For detailed deployment instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md).
