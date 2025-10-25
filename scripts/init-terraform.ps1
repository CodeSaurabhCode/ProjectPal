# Initialize Terraform Backend and Azure Resources
# Run this script ONCE before deploying infrastructure

param(
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [string]$EnvironmentName = "dev"
)

# Get the project root directory (parent of scripts folder)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "Initializing ProjectPal Infrastructure..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Check if Azure CLI is installed
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Azure CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if Terraform is installed
if (!(Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Terraform is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://www.terraform.io/downloads.html" -ForegroundColor Yellow
    exit 1
}

Write-Host "Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Login to Azure
Write-Host "Logging into Azure..." -ForegroundColor Cyan
az login

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Azure login failed" -ForegroundColor Red
    exit 1
}

# Get subscription ID
$subscriptionId = az account show --query id -o tsv
Write-Host "Using subscription: $subscriptionId" -ForegroundColor Green
Write-Host ""

# Create terraform.tfvars from example
Write-Host "Creating terraform.tfvars..." -ForegroundColor Cyan
if (!(Test-Path "terraform\terraform.tfvars")) {
    Copy-Item "terraform\terraform.tfvars.example" "terraform\terraform.tfvars"
    Write-Host "WARNING: Please edit terraform\terraform.tfvars and add your OpenAI API key!" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "terraform.tfvars already exists" -ForegroundColor Green
}

# Initialize Terraform
Write-Host "Initializing Terraform..." -ForegroundColor Cyan
Set-Location terraform
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform initialization failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..
Write-Host "Terraform initialized successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Initialization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Edit terraform\terraform.tfvars and add your OpenAI API key" -ForegroundColor White
Write-Host "2. Run: .\scripts\deploy.ps1" -ForegroundColor White
Write-Host ""
