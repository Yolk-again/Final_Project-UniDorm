$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $projectRoot "backend"
$controllerPath = Join-Path $backendRoot "src\announcement\announcement.controller.ts"
$appModulePath = Join-Path $backendRoot "src\app.module.ts"
$port = 3001

if (-not (Test-Path (Join-Path $backendRoot "package.json"))) {
    throw "Backend folder was not found at: $backendRoot"
}
if (-not (Test-Path $controllerPath) -or -not (Test-Path $appModulePath)) {
    throw "Announcement controller or application module is missing. Re-extract the complete project ZIP."
}

$controllerSource = Get-Content -LiteralPath $controllerPath -Raw
$appModuleSource = Get-Content -LiteralPath $appModulePath -Raw
if ($controllerSource -notmatch '@Patch\(\s*["'']:id/read["'']\s*\)' -or $appModuleSource -notmatch 'AnnouncementModule') {
    throw "The announcement read PATCH route is not registered in the current source. The API will not be started."
}

function Get-PortListenerIds {
    $connections = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    return @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
}

function Get-ProcessLineage {
    param([int]$StartProcessId)

    $lineage = @()
    $seen = @{}
    $currentId = $StartProcessId

    for ($depth = 0; $depth -lt 12 -and $currentId -gt 0; $depth++) {
        if ($seen.ContainsKey([string]$currentId)) { break }
        $seen[[string]$currentId] = $true
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $currentId" -ErrorAction SilentlyContinue
        if (-not $processInfo) { break }
        $lineage += $processInfo
        $currentId = [int]$processInfo.ParentProcessId
    }

    return $lineage
}

function Clear-UniDormPort {
    param([int]$WaitSeconds = 10)

    for ($attempt = 1; $attempt -le $WaitSeconds; $attempt++) {
        $listenerIds = @(Get-PortListenerIds)
        if ($listenerIds.Count -eq 0) {
            return
        }

        foreach ($listenerId in $listenerIds) {
            $lineage = @(Get-ProcessLineage -StartProcessId ([int]$listenerId))
            if ($lineage.Count -eq 0) { continue }

            $matchingRoots = @($lineage | Where-Object {
                $name = [string]$_.Name
                $commandLine = [string]$_.CommandLine
                $isNodeOrCmd = $name -match '^(node|cmd)\.exe$'
                $isThisProject = $commandLine.IndexOf($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
                $isThisLauncher = ($name -ieq 'powershell.exe' -or $name -ieq 'pwsh.exe') -and
                    $commandLine.IndexOf('FIX-ANNOUNCEMENT-READ.ps1', [System.StringComparison]::OrdinalIgnoreCase) -ge 0
                ($isNodeOrCmd -and $isThisProject) -or $isThisLauncher
            })

            if ($matchingRoots.Count -eq 0) {
                $owner = $lineage[0]
                $ownerCommand = [string]$owner.CommandLine
                if ([string]::IsNullOrWhiteSpace($ownerCommand)) { $ownerCommand = '(command line unavailable)' }
                throw "Port $port is still occupied by PID $listenerId, which does not safely identify as this UniDorm project. Nothing else was terminated. Run: Get-CimInstance Win32_Process -Filter 'ProcessId = $listenerId' | Select-Object ProcessId,Name,CommandLine ; then stop that app or close its terminal before rerunning. Command: $ownerCommand"
            }

            # The highest matching Node/CMD process in this listener's ancestry is the
            # Nest/Next runner for this project. /T also stops its child server process,
            # preventing a Nest watch process from respawning the listener.
            $target = $matchingRoots[$matchingRoots.Count - 1]
            Write-Host "Stopping stale UniDorm process tree (PID $($target.ProcessId), $($target.Name)) that owns port $port..." -ForegroundColor Yellow
            & "$env:SystemRoot\System32\taskkill.exe" /PID ([int]$target.ProcessId) /T /F | Out-Null
        }

        Start-Sleep -Milliseconds 900
    }

    $remaining = @(Get-PortListenerIds)
    if ($remaining.Count -gt 0) {
        throw "Port $port is still occupied after cleanup attempts. Listener PID(s): $($remaining -join ', '). Close the old UniDorm backend/frontend terminals, then run this script again."
    }
}

if (-not (Test-Path (Join-Path $backendRoot "node_modules"))) {
    throw "Backend dependencies are missing. Run npm.cmd ci inside the backend folder first."
}

$prismaCli = Join-Path $backendRoot "node_modules\.bin\prisma.cmd"
if (-not (Test-Path $prismaCli)) {
    throw "Prisma CLI was not found. Run npm.cmd ci inside the backend folder first."
}

Write-Host "Checking port $port and stopping only stale UniDorm processes if necessary..." -ForegroundColor Cyan
Clear-UniDormPort -WaitSeconds 8

Set-Location $backendRoot
Write-Host "Applying any pending Prisma migrations..." -ForegroundColor Cyan
& $prismaCli migrate deploy
if ($LASTEXITCODE -ne 0) {
    throw "Prisma migration deploy failed with exit code $LASTEXITCODE. Check backend\.env and PostgreSQL."
}

Write-Host "Regenerating Prisma Client..." -ForegroundColor Cyan
& $prismaCli generate
if ($LASTEXITCODE -ne 0) {
    throw "Prisma Client generation failed with exit code $LASTEXITCODE."
}

Write-Host "Building the current backend source, including PATCH /announcements/:id/read..." -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed with exit code $LASTEXITCODE. The API will not be started."
}

# Check again immediately before starting. This catches watcher processes that
# were respawned during a build and prevents an opaque EADDRINUSE crash.
Clear-UniDormPort -WaitSeconds 8

Write-Host "Port $port is free. Starting the freshly built UniDorm API..." -ForegroundColor Green
Write-Host "Keep this terminal open. In a second terminal, run VERIFY-ANNOUNCEMENT-READ-ROUTE.ps1." -ForegroundColor Gray
& npm.cmd run start:prod
