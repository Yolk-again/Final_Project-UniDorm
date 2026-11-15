$ErrorActionPreference = "Stop"

$apiUrl = "http://127.0.0.1:3001/health"
$frontendUrl = "http://127.0.0.1:3000/"

Write-Host "Checking UniDorm backend on port 3001..." -ForegroundColor Cyan
$apiPort = Test-NetConnection 127.0.0.1 -Port 3001 -InformationLevel Quiet

if (-not $apiPort) {
    Write-Host "Backend port 3001 is not accepting connections." -ForegroundColor Red
    Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue |
        Select-Object LocalAddress, LocalPort, OwningProcess
    throw "Start the backend with: Set-Location .\backend; npm run start:dev"
}

try {
    $health = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 5
    if ($health.status -ne "ok") {
        throw "The health endpoint did not report status=ok."
    }
    Write-Host "Backend OK: $($health.service)" -ForegroundColor Green
} catch {
    Write-Host "Port 3001 is open, but it did not return the UniDorm health response." -ForegroundColor Red
    Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue |
        Select-Object LocalAddress, LocalPort, OwningProcess
    throw $_
}

Write-Host "Checking UniDorm frontend on port 3000..." -ForegroundColor Cyan
try {
    $frontend = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 10
    if ($frontend.StatusCode -ne 200) {
        throw "Frontend returned HTTP $($frontend.StatusCode)."
    }
    Write-Host "Frontend OK: HTTP $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Frontend is not responding at $frontendUrl" -ForegroundColor Red
    Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue |
        Select-Object LocalAddress, LocalPort, OwningProcess
    throw $_
}

Write-Host "Both services are reachable. Open http://localhost:3000" -ForegroundColor Green
