$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $projectRoot "backend"

if (-not (Test-Path (Join-Path $backendRoot "package.json"))) {
    throw "Backend folder was not found at: $backendRoot"
}

$connections = @(Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue)
$processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

foreach ($processId in $processIds) {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
    if (-not $processInfo) { continue }

    $commandLine = [string]$processInfo.CommandLine
    if ($commandLine.IndexOf($backendRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Port 3001 is occupied by PID $processId, which does not appear to belong to this backend. Stop that server manually, then run this script again."
    }

    Stop-Process -Id $processId -Force
    Write-Host "Stopped the old UniDorm backend process (PID $processId)." -ForegroundColor Yellow
}

Set-Location $backendRoot

if (-not (Test-Path "node_modules")) {
    throw "Backend dependencies are missing. Run npm.cmd ci inside the backend folder first."
}

$prismaCli = Join-Path $backendRoot "node_modules\.bin\prisma.cmd"
if (-not (Test-Path $prismaCli)) {
    throw "Prisma CLI was not found. Run 'npm.cmd ci' inside the backend folder first."
}

Write-Host "Applying any pending Prisma migrations..." -ForegroundColor Cyan
& $prismaCli migrate deploy
if ($LASTEXITCODE -ne 0) {
    throw "Prisma migration deploy failed with exit code $LASTEXITCODE. Check backend\.env and PostgreSQL before continuing."
}

Write-Host "Regenerating Prisma Client from the current schema..." -ForegroundColor Cyan
& $prismaCli generate
if ($LASTEXITCODE -ne 0) {
    throw "Prisma Client generation failed with exit code $LASTEXITCODE. The backend will not be started."
}

Write-Host "Building the backend with the regenerated Prisma Client..." -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed with exit code $LASTEXITCODE. The API will not be started."
}

Write-Host "Starting the freshly built UniDorm API on port 3001..." -ForegroundColor Green
Write-Host "Leave this terminal open while using UniDorm. Press Ctrl+C to stop the API." -ForegroundColor Gray
& npm.cmd run start:prod
