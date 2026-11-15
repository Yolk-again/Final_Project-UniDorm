# UniDorm port 3001 startup fix

The earlier launcher could stop the active Nest child process while leaving its `nest start --watch` parent alive. That watcher could respawn the API, causing the freshly built server to fail with `EADDRINUSE`.

The updated `FIX-ANNOUNCEMENT-READ.ps1` now:

- checks port 3001 before and after the build;
- walks the listener process ancestry;
- stops the matching UniDorm Node/CMD process tree, rather than only the child PID;
- waits for the port to become free;
- never kills a process that it cannot identify as belonging to this project;
- reports the PID and command line if an unrelated process owns port 3001.

## Run

Stop both development terminals with Ctrl+C first. Extract the ZIP over the project root, then run:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\FIX-ANNOUNCEMENT-READ.ps1"
```

Keep the backend terminal open. In a second terminal:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\VERIFY-ANNOUNCEMENT-READ-ROUTE.ps1"
```

Then start the frontend separately on port 3000:

```powershell
Set-Location "$root\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

No new migration is included in this port-only repair. `migrate deploy` remains safe to rerun and will apply only pending migrations.
