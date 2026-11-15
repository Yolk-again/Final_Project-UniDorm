# Round 12 PowerShell instructions

Stop the backend and frontend terminals before starting the repair. Extract the ZIP over `C:\Users\joetu\Projects\Final_Project-UniDorm`, preserving `.git`, `backend\.env`, and `frontend\.env.local`.

From PowerShell 5.1:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\FIX-BILL-NOTIFICATION-500.ps1"
```

Keep that backend terminal open. In a second terminal:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\VERIFY-BILL-NOTIFICATION-ROUTE.ps1"
```

Then start the frontend:

```powershell
Set-Location "$root\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Do not run `prisma migrate reset`. If `migrate deploy` reports a failed migration, stop and inspect the error rather than force-resolving it.
