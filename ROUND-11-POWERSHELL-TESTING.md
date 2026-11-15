# Round 11 — PowerShell 5.1 install and test

Stop both running development servers before replacing source files. Extract the ZIP into the existing `Final_Project-UniDorm` root. Keep `.git`, `backend\.env`, `frontend\.env.local`, and existing payment proof files.

```powershell
$ErrorActionPreference = "Stop"
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"

Set-Location "$root\backend"
npm ci
.\node_modules\.bin\prisma.cmd validate
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

Set-Location "$root\frontend"
npm ci
npm run lint
npm run build
```

If `prisma migrate deploy` reports a previously failed Round 10 migration (`P3009`/`P3018`), stop. Do not reset the database or blindly resolve migration history. Use the Round 10 recovery instructions only after confirming the exact failed migration in `prisma migrate status`.

## Notification acceptance checks

1. Log in as Student A and open the bell. Confirm only Student A's notifications appear.
2. As admin, create a bill for Student A. Student A should receive a new-bill notification; Student B should not.
3. Submit payment proof as Student A. Admin accounts should receive a verification notification.
4. Approve or reject the submission as admin. Student A should receive the result notification.
5. Submit a room booking as a student. Admin receives a booking request notification; the student receives the approval/rejection result later.
6. Publish an ALL/MALE/FEMALE announcement. Only students matching its audience receive the notification.
7. Send a direct/group message. The recipient receives a notification; the sender does not receive a notification for their own group message.
8. Create a room. Students matching that room's gender receive an availability notification.
9. Mark one notification as read, refresh, and confirm it remains read. Use Mark all as read and confirm the unread count reaches zero.
10. Log into a second student account and confirm its read state and notifications are independent.

The notification panel polls every 30 seconds while open or closed on the authenticated dashboard. Selecting a notification marks it read on the server before navigating to the related workspace tab.
