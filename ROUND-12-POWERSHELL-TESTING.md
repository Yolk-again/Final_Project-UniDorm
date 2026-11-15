# Round 12 — PowerShell Testing

Stop the backend and frontend servers before replacing files. Extract this ZIP over `C:\Users\joetu\Projects\Final_Project-UniDorm`, preserving `.git`, `backend\.env`, and `frontend\.env.local`.

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"

Set-Location "$root\backend"
.\node_modules\.bin\prisma.cmd generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

Set-Location "$root\frontend"
npm run lint
npm run build
```

No database migration is required.

## Manual test

1. Log in as a student and confirm the Payments tab has no red dot when there are no unread bill notifications.
2. Log in as an admin in another session and create a bill for that student's exact approved room.
3. Return to the student dashboard or wait for the next dashboard sync (60 seconds). The red dot should appear beside Payments.
4. Refresh the page before opening Payments. The red dot should remain.
5. Open Payments. The student bill list is refreshed first; only after the bill list loads successfully does the app mark bill-created notifications as read. The dot then disappears after the server confirms the read update.
6. Refresh the page. The dot should remain gone.
7. Create another bill for the same student. A new `BILL_CREATED` notification should make the dot appear again.
8. Sign in as a different student. That account must not see the first student's bill notification or red dot.
9. Open the Payments tab through the notification bell and through the My Stay `View my bills` action; both paths should load bills and clear the same red dot.
