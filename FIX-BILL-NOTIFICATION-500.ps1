$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$prisma = Join-Path $backend "node_modules\.bin\prisma.cmd"
$npm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"

if (-not (Test-Path (Join-Path $backend "package.json"))) {
    throw "Backend package.json was not found. Extract the ZIP into the UniDorm project root."
}
if (-not (Test-Path (Join-Path $backend ".env"))) {
    throw "backend\.env was not found. Restore your existing database configuration before continuing."
}

Write-Host "Stopping existing UniDorm backend processes..." -ForegroundColor Cyan
$nodeProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -ieq "node.exe" -and
    $_.CommandLine -and
    $_.CommandLine.IndexOf($backend, [StringComparison]::OrdinalIgnoreCase) -ge 0
}
foreach ($process in $nodeProcesses) {
    Write-Host "Stopping backend process $($process.ProcessId)..." -ForegroundColor Yellow
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

if (-not (Test-Path $prisma)) {
    Write-Host "Prisma CLI is missing. Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location $backend
    try {
        if (Test-Path "node_modules") {
            Remove-Item "node_modules" -Recurse -Force
        }
        if (Test-Path $npm) { & $npm ci } else { & npm.cmd ci }
        if ($LASTEXITCODE -ne 0) { throw "Backend npm ci failed. Close all UniDorm Node.js processes and retry." }
    } finally {
        Pop-Location
    }
}
if (-not (Test-Path $prisma)) {
    throw "Prisma CLI is still missing after dependency installation."
}

Push-Location $backend
try {
    Write-Host "Validating Prisma schema..." -ForegroundColor Cyan
    & $prisma validate
    if ($LASTEXITCODE -ne 0) { throw "Prisma schema validation failed." }

    Write-Host "Inspecting migration history. Pending migrations are expected and will be deployed." -ForegroundColor Cyan
    $statusOutput = & $prisma migrate status 2>&1
    $statusCode = $LASTEXITCODE
    $statusText = ($statusOutput | Out-String)
    $statusOutput | ForEach-Object { Write-Host $_ }

    if ($statusText -match '(?im)^\s*Following migration have failed:' -or
        $statusText -match '(?im)^\s*The following migration\(s\) have failed:' -or
        $statusText -match '(?im)^\s*Failed migrations?:') {
        throw "Prisma reports an actually failed migration. No resolve, reset, or data deletion was attempted. Review the migration error before continuing."
    }

    Write-Host "Applying pending migrations, including 20261115100000_add_in_app_notifications..." -ForegroundColor Cyan
    & $prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Prisma migrate deploy failed. The database was not reset and no migration was marked resolved. Review the complete Prisma error."
    }

    Write-Host "Verifying migration status after deployment..." -ForegroundColor Cyan
    & $prisma migrate status
    if ($LASTEXITCODE -ne 0) { throw "Migrations are still pending or inconsistent after deployment." }

    Write-Host "Regenerating Prisma Client..." -ForegroundColor Cyan
    & $prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma Client generation failed." }

    Write-Host "Building backend..." -ForegroundColor Cyan
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }

    Write-Host "Running backend unit tests..." -ForegroundColor Cyan
    & npm.cmd test -- --runInBand
    if ($LASTEXITCODE -ne 0) { throw "Backend unit tests failed." }

    Write-Host "Running backend e2e tests..." -ForegroundColor Cyan
    & npm.cmd run test:e2e -- --runInBand
    if ($LASTEXITCODE -ne 0) { throw "Backend e2e tests failed." }

    Write-Host "Starting the freshly built UniDorm API on port 3001..." -ForegroundColor Green
    Write-Host "Expected route: GET /notifications/unread-count/BILL_CREATED (authentication required)." -ForegroundColor Green
    & npm.cmd run start:prod
    if ($LASTEXITCODE -ne 0) { throw "Backend stopped with exit code $LASTEXITCODE." }
} finally {
    Pop-Location
}
