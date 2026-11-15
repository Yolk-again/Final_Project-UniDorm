$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$nested = Join-Path $root "Final_Project-UniDorm"

if (-not (Test-Path (Join-Path $root "frontend\package.json")) -or -not (Test-Path (Join-Path $root "backend\package.json"))) {
    throw "The clean project root is incomplete. Extract the clean ZIP directly into the outer Final_Project-UniDorm folder first."
}

if (-not (Test-Path $nested)) {
    Write-Host "No nested duplicate project folder found. The project root is already clean." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path (Join-Path $nested "frontend\package.json")) -or -not (Test-Path (Join-Path $nested "backend\package.json"))) {
    throw "The inner folder does not look like a duplicate UniDorm project. It was left untouched."
}

$parent = Split-Path -Parent $root
$rootName = Split-Path -Leaf $root
$backup = Join-Path $parent ($rootName + "-nested-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backup | Out-Null

robocopy $nested $backup /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /XD node_modules .next dist coverage .turbo
if ($LASTEXITCODE -ge 8) {
    throw "Nested-folder backup failed. The duplicate folder was not removed. Backup location: $backup"
}

$preserve = @(
    @{ Source = ".git"; Target = ".git" },
    @{ Source = "backend\.env"; Target = "backend\.env" },
    @{ Source = "frontend\.env.local"; Target = "frontend\.env.local" }
)

foreach ($item in $preserve) {
    $sourcePath = Join-Path $nested $item.Source
    $targetPath = Join-Path $root $item.Target
    if ((Test-Path $sourcePath) -and -not (Test-Path $targetPath)) {
        $targetParent = Split-Path -Parent $targetPath
        if (-not (Test-Path $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse -Force
    }
}

Remove-Item -LiteralPath $nested -Recurse -Force

Write-Host "Nested duplicate folder removed." -ForegroundColor Green
Write-Host "Backup of the old inner folder: $backup" -ForegroundColor Cyan
Write-Host "Private .env files and Git history were preserved when the outer root did not already contain them." -ForegroundColor Green
