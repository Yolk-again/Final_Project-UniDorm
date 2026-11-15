# Round 8 PowerShell Testing

Run from the project root after stopping the development servers:

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

Then restart the backend (`npm run start:dev`) and frontend (`npm run dev -- --hostname 127.0.0.1 --port 3000`).

Test every chat type while logged in as both roles: open male group, female group, and direct chat; refresh the page; confirm the read dot remains cleared; send a new message from the other account and confirm the dot appears again. Confirm direct chats can send immediately without request/accept/reject controls.
