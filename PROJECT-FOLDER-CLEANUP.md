# UniDorm project-folder cleanup

The ZIP is structured to extract directly into the outer `Final_Project-UniDorm` folder. If an old `Final_Project-UniDorm` folder still exists inside that folder, use the launcher below.

## Run the cleanup

From PowerShell at the outer project root, run:

```powershell
.\RUN-CLEANUP.cmd
```

`RUN-CLEANUP.cmd` starts Windows PowerShell with `-ExecutionPolicy Bypass` for that child process only. It does **not** change the machine-wide or user-wide execution policy. You do not need Administrator privileges.

You can also run the script directly without the launcher:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\CLEAN-NESTED-FOLDER.ps1
```

The cleanup script first verifies that both the outer and inner directories look like UniDorm projects. It backs up the inner directory next to the outer project before removing it. It preserves `.git`, `backend\.env`, and `frontend\.env.local` from the inner folder only when the corresponding item is missing from the outer folder. It does not remove the outer project.

## Verify

```powershell
$root = (Get-Location).Path
Test-Path "$root\frontend\package.json"
Test-Path "$root\backend\package.json"
Test-Path "$root\Final_Project-UniDorm"
```

Expected results: `True`, `True`, `False`. The backup folder is created alongside the project and should be kept until the application has been tested.
