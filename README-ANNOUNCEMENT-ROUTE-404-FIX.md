# UniDorm announcement read route fix

1. Stop both existing development servers with Ctrl+C.
2. Extract this project ZIP over your existing `Final_Project-UniDorm` folder. Keep `.git`, `backend/.env`, and `frontend/.env.local`.
3. Open Windows PowerShell in the project root:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\FIX-ANNOUNCEMENT-READ.ps1"
```

4. Keep that backend terminal open. In a second PowerShell window:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\VERIFY-ANNOUNCEMENT-READ-ROUTE.ps1"
```

Expected result: `PASS` with HTTP 401 or 403. Those statuses are correct without a login token; they prove the route exists. A 404 means an older/different API process is still answering on port 3001.

Then start the frontend:

```powershell
Set-Location "$root\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

No database reset is required. The existing announcement read receipt migration is retained.


## Port 3001 startup repair

The updated launcher now stops the owning UniDorm process tree (including a Nest watch parent) and verifies the port is free before starting the production backend. See `PORT-3001-STARTUP-FIX.md`.
