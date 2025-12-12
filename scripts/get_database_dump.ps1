# PowerShell script to help get database dump from teammate
# Usage: .\scripts\get_database_dump.ps1

Write-Host "=== Database Dump Helper ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script helps you get a database dump from your teammate." -ForegroundColor Yellow
Write-Host ""

# Instructions for teammate
Write-Host "INSTRUCTIONS FOR YOUR TEAMMATE:" -ForegroundColor Green
Write-Host "------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "1. Open PowerShell/Command Prompt" -ForegroundColor White
Write-Host "2. Run this command (replace 'database_name' with actual database name):" -ForegroundColor White
Write-Host ""
Write-Host "   pg_dump -U postgres -d database_name > database_backup.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Or for binary format (smaller file):" -ForegroundColor White
Write-Host ""
Write-Host "   pg_dump -U postgres -d database_name -F c -f database_backup.dump" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Send you the database_backup.sql or database_backup.dump file" -ForegroundColor White
Write-Host ""

# Instructions for user
Write-Host "INSTRUCTIONS FOR YOU:" -ForegroundColor Green
Write-Host "---------------------" -ForegroundColor Green
Write-Host ""
Write-Host "1. Make sure PostgreSQL is installed and running" -ForegroundColor White
Write-Host "2. Create an empty database:" -ForegroundColor White
Write-Host ""
Write-Host "   psql -U postgres" -ForegroundColor Cyan
Write-Host "   CREATE DATABASE cs308_project;" -ForegroundColor Cyan
Write-Host "   \q" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Once you receive the dump file, restore it:" -ForegroundColor White
Write-Host ""
Write-Host "   For .sql file:" -ForegroundColor Yellow
Write-Host "   psql -U postgres -d cs308_project < database_backup.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "   For .dump file:" -ForegroundColor Yellow
Write-Host "   pg_restore -U postgres -d cs308_project database_backup.dump" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Update your backend/.env file with database credentials" -ForegroundColor White
Write-Host ""

$response = Read-Host "Do you want to check if PostgreSQL is installed? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    try {
        $version = psql --version
        Write-Host "PostgreSQL is installed: $version" -ForegroundColor Green
    } catch {
        Write-Host "PostgreSQL is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


