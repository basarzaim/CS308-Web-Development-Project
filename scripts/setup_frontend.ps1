# PowerShell script to setup frontend
# Usage: .\scripts\setup_frontend.ps1

Write-Host "=== Frontend Setup Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm is not installed!" -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
$frontendPath = Join-Path $PSScriptRoot ".." "frontend"
Set-Location $frontendPath

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Frontend Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start development server: npm run dev" -ForegroundColor White
Write-Host "2. Frontend will be available at http://localhost:5173" -ForegroundColor White
Write-Host ""


