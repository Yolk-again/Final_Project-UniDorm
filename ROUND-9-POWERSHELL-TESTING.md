# Round 9 — PowerShell Testing

Stop the running backend and frontend terminals before applying this update. Extract the ZIP over `C:\Users\joetu\Projects\Final_Project-UniDorm`, preserving `.git`, `backend\.env`, and `frontend\.env.local`.

Run in PowerShell 5.1:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location "$root\backend"
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
Set-Location "$root\frontend"
npm run lint
npm run build
```

Manual verification:
1. Log in as a student who has not opened the Announcements tab. Confirm the tab shows the unread dot and new announcement labels.
2. Open Announcements. The visible announcements should be marked as read and the navigation dot should disappear after the server responds.
3. Refresh the browser. The dot should remain gone.
4. Log in as another student. The same announcements should still be unread for that account until that student opens them.
5. Publish another announcement as admin. It should appear as unread for eligible students.
