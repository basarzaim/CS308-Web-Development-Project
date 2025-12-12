# PowerShell script to setup backend
# Usage: .\scripts\setup_backend.ps1

Write-Host "=== Backend Setup Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot ".." "backend"
Set-Location $backendPath

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists. Skipping creation." -ForegroundColor Yellow
} else {
    python -m venv venv
    Write-Host "Virtual environment created!" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install requirements
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
Write-Host "Dependencies installed!" -ForegroundColor Green

# Check for .env file
Write-Host ""
Write-Host "Checking for .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host ".env file exists!" -ForegroundColor Green
} else {
    Write-Host ".env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating .env file template..." -ForegroundColor Yellow
    
    $envContent = @"
# Database Configuration
DB_NAME=cs308_project
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_HOST=localhost
DB_PORT=5432
DB_SSL=disable
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host ".env file created! Please edit it with your database credentials." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Backend Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit backend/.env file with your database credentials" -ForegroundColor White
Write-Host "2. Make sure PostgreSQL is running and database exists" -ForegroundColor White
Write-Host "3. Run migrations: python manage.py migrate" -ForegroundColor White
Write-Host "4. Create superuser (optional): python manage.py createsuperuser" -ForegroundColor White
Write-Host "5. Start server: python manage.py runserver" -ForegroundColor White
Write-Host ""


