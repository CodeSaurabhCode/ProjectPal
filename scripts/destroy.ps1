# ============================================================================
# Destroy ProjectPal Infrastructure
# ============================================================================
# CAUTION: This will delete ALL Azure resources
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Get the project root directory (parent of scripts folder)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "WARNING: This will destroy ALL ProjectPal infrastructure!" -ForegroundColor Red
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

if (!$Force) {
    $confirmation = Read-Host "Are you sure you want to continue? (Type 'yes' to confirm)"
    
    if ($confirmation -ne "yes") {
        Write-Host "Destruction cancelled" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Destroying infrastructure..." -ForegroundColor Red
Write-Host ""

Set-Location terraform

# Terraform Destroy
terraform destroy -auto-approve

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform destroy failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "Infrastructure destroyed successfully" -ForegroundColor Green
Write-Host ""
