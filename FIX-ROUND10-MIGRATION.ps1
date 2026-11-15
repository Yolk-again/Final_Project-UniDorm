$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$prisma = Join-Path $backend "node_modules\.bin\prisma.cmd"
$failedMigration = "20261115060000_enforce_core_data_integrity"

if (-not (Test-Path $prisma)) {
    throw "Prisma CLI was not found. Run npm ci inside the backend folder first."
}

Set-Location $backend

Write-Host "Resolving only the failed Round 10 integrity migration as rolled back..." -ForegroundColor Cyan
& $prisma migrate resolve --rolled-back $failedMigration
if ($LASTEXITCODE -ne 0) {
    throw "Could not resolve the failed migration. Run prisma migrate status and inspect the migration history before continuing."
}

Write-Host "Applying the corrected integrity migration..." -ForegroundColor Cyan
& $prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    throw "Migration deployment failed. Stop and inspect the database error. Do not reset the database."
}

Write-Host "Regenerating Prisma Client..." -ForegroundColor Cyan
& $prisma generate
if ($LASTEXITCODE -ne 0) {
    throw "Prisma Client generation failed."
}

Write-Host "Building backend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed."
}

Write-Host "Running backend unit tests..." -ForegroundColor Cyan
npm test -- --runInBand
if ($LASTEXITCODE -ne 0) {
    throw "Backend unit tests failed."
}

Write-Host "Running backend e2e tests..." -ForegroundColor Cyan
npm run test:e2e -- --runInBand
if ($LASTEXITCODE -ne 0) {
    throw "Backend e2e tests failed."
}

Write-Host "Round 10 migration recovery and backend checks completed." -ForegroundColor Green
